import { ApiScraper, SCRAPER_USER_AGENT } from "../api-base.js";
import { classifyUkTender } from "./uk-category-map.js";
import { logger } from "../../utils/logger.js";
import type { Tender, ProcurementCategory } from "../../types/index.js";

// UNGM (United Nations Global Marketplace, ungm.org) is where WHO — like most
// UN agencies — publishes its procurement notices. Its public tender search
// is backed by a JSON endpoint the site's own frontend calls. We query it for
// WHO notices and keep the health-relevant ones.
//
// The response field names below are matched defensively (several candidate
// keys per field) because UNGM's public payload isn't formally documented and
// this sandbox's network policy blocks ungm.org, so the exact shape is
// unverified against a live response. Run once on the server and check
// scrape_runs / a raw dump before relying on it — a wrong field name degrades
// to "missing" (notice skipped) rather than crashing the run.

interface UngmNotice {
  [key: string]: unknown;
}

interface UngmSearchResponse {
  // Observed candidate wrappers across UNGM-style endpoints.
  notices?: UngmNotice[];
  Data?: UngmNotice[];
  data?: UngmNotice[];
  results?: UngmNotice[];
  totalCount?: number;
  TotalCount?: number;
}

// Pull the first present, non-empty value across a list of candidate keys
// (case variations included) so slightly-off field-name guesses still resolve.
function pick(notice: UngmNotice, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = notice[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

// UN two-/three-letter country hints → ISO-2 where obvious; otherwise pass the
// raw string through (buyer_country is free-text, not constrained).
function normalizeCountry(raw: string | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return trimmed;
}

function parseDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * WHO Procurement via UNGM (ungm.org) — WHO's tender notices published on the
 * UN Global Marketplace. No API key required. Queries the public notice search
 * filtered to WHO as the publishing agency, keeps health-relevant notices, and
 * classifies them with the shared keyword/CPV classifier.
 *
 * NOTE: written to UNGM's observed public search contract but NOT verified
 * against a live response (this sandbox blocks ungm.org). Field access is
 * defensive; failures surface into scrape_runs.errors. Verify on the server
 * before relying on it.
 */
export class WHOProcurementScraper extends ApiScraper {
  readonly source = "who_procurement" as const;
  readonly baseUrl = "https://www.ungm.org";

  private readonly apiUrl = "https://www.ungm.org/Public/Notice/Search";
  private readonly pageSize = 100;
  private readonly maxPages = 5;

  protected async fetchTenders(): Promise<Partial<Tender>[]> {
    const out: Partial<Tender>[] = [];
    const seen = new Set<string>();

    for (let page = 0; page < this.maxPages; page++) {
      // UNGM's search is a POST with a JSON body; filter to WHO and newest-first.
      const body = {
        PageIndex: page,
        PageSize: this.pageSize,
        Title: "",
        Description: "",
        Agencies: ["WHO"],
        UNOrganisations: ["WHO"],
        SortField: "DatePublished",
        SortAscending: false,
      };

      let res: Response;
      try {
        res = await fetch(this.apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "User-Agent": SCRAPER_USER_AGENT,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(30000),
        });
      } catch (err) {
        if (page === 0) throw new Error(`WHO/UNGM request failed: ${String(err)}`);
        logger.warn("WHO/UNGM: request failed on later page, stopping", { page, error: String(err) });
        break;
      }

      if (!res.ok) {
        const snippet = (await res.text().catch(() => "")).slice(0, 300);
        if (page === 0) throw new Error(`WHO/UNGM returned ${res.status}: ${snippet}`);
        logger.warn("WHO/UNGM: non-OK on later page, stopping", { page, status: res.status });
        break;
      }

      // UNGM's public search is a session/CSRF-protected ASP.NET app, not a
      // JSON API — an unauthenticated POST gets an HTML error page back. Detect
      // that and fail with a clear, actionable message instead of a cryptic
      // "Unexpected token '<'" JSON parse error.
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("json")) {
        throw new Error(
          "WHO/UNGM did not return JSON (got HTML) — ungm.org has no public JSON search API; " +
          "it requires a browser session/anti-forgery token. This source needs browser automation " +
          "or an alternative WHO procurement feed.",
        );
      }

      const data = (await res.json()) as UngmSearchResponse | UngmNotice[];
      const notices = Array.isArray(data)
        ? data
        : data.notices ?? data.Data ?? data.data ?? data.results ?? [];

      if (notices.length === 0) break;

      for (const n of notices) {
        const externalId = pick(n, ["DisplayId", "Id", "id", "NoticeId", "noticeId", "Reference"]);
        if (!externalId || seen.has(externalId)) continue;

        const title = pick(n, ["Title", "title", "Name"]);
        if (!title) continue;

        // Keep only genuinely WHO notices in case the agency filter is loose.
        const agency = pick(n, ["AgencyName", "UNOrganisation", "UNOrganization", "Organization", "agency"]) ?? "";
        if (agency && !/who|world health/i.test(agency)) continue;

        const description = pick(n, ["Description", "description", "Summary"]) ?? "";
        const category = classifyUkTender(title, description);
        // WHO notices are overwhelmingly health-related; keep everything except
        // clearly-unclassifiable ("other") notices with no health keyword hit.
        if (category === "other" && !/health|medical|pharma|vaccine|hospital|clinic|diagnostic/i.test(`${title} ${description}`)) {
          continue;
        }

        seen.add(externalId);
        out.push(this.mapNotice(n, externalId, title, description, category));
      }

      const total = Number(
        (Array.isArray(data) ? undefined : data.totalCount ?? data.TotalCount) ?? NaN
      );
      if (!Number.isNaN(total) && (page + 1) * this.pageSize >= total) break;
      if (notices.length < this.pageSize) break;
    }

    logger.info("WHO/UNGM: health notices collected", { count: out.length });
    return out;
  }

  private mapNotice(
    notice: UngmNotice,
    externalId: string,
    title: string,
    description: string,
    category: ProcurementCategory,
  ): Partial<Tender> {
    const published = parseDate(pick(notice, ["Published", "DatePublished", "PublishedDate", "publishedDate"]));
    const deadline = parseDate(pick(notice, ["Deadline", "DeadlineDate", "deadline", "ClosingDate"]));
    const country = normalizeCountry(pick(notice, ["Country", "country", "DutyStation", "BeneficiaryCountry"]));
    const noticeUrl = pick(notice, ["Url", "url", "Link"]);

    return {
      externalId,
      source: "who_procurement",
      title,
      description,
      buyerName: pick(notice, ["AgencyName", "UNOrganisation", "UNOrganization"]) ?? "World Health Organization",
      buyerCountry: country || "CH", // WHO HQ is Geneva when a notice carries no country
      buyerRegion: "Global",
      category,
      status: deadline && deadline.getTime() < Date.now() ? "closed" : "open",
      publishedAt: published ?? new Date(),
      deadline,
      originalCurrency: "USD",
      originalValue: null,
      valueUsd: null,
      complianceCriteria: ["WHO procurement standards", "UNGM registration"],
      cpvCodes: [],
      url: noticeUrl
        ? (noticeUrl.startsWith("http") ? noticeUrl : `${this.baseUrl}${noticeUrl}`)
        : `${this.baseUrl}/Public/Notice/${externalId}`,
      rawData: { agency: pick(notice, ["AgencyName", "UNOrganisation"]), noticeType: pick(notice, ["NoticeType", "Type"]) },
    };
  }
}
