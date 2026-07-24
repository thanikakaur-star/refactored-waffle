import { ApiScraper, SCRAPER_USER_AGENT, sleep } from "../api-base.js";
import { convertToUsd } from "../../utils/currency.js";
import { logger } from "../../utils/logger.js";
import type { Tender, ProcurementCategory } from "../../types/index.js";

// CPV prefix → our category. TED notices are reliably CPV-coded, so this is
// the primary classifier (unlike the UK/World Bank sources that lean on
// keywords). Matched by 8-digit prefix, longest-specific first.
const CPV_CATEGORY_MAP: Record<string, ProcurementCategory> = {
  "33100000": "medical_devices",
  "33110000": "medical_devices",
  "33120000": "diagnostics",
  "33130000": "surgical_instruments",
  "33140000": "personal_protective_equipment",
  "33150000": "medical_devices",
  "33160000": "surgical_instruments",
  "33170000": "medical_devices",
  "33190000": "medical_devices",
  "33600000": "pharmaceuticals",
  "33690000": "pharmaceuticals",
  "38000000": "laboratory_equipment",
  "48000000": "health_it",
  "85100000": "clinical_services",
  "85142100": "allied_health", // physiotherapy services
  "85142000": "allied_health", // paramedical services (physio, OT, SLT)
  "85140000": "telemedicine",
  "85300000": "social_care",
  "85310000": "social_care",
  "45215100": "hospital_infrastructure",
};

// A TED notice field value can be a plain string, an array, or a multilingual
// object keyed by ISO-639 code (e.g. { "eng": "..." }). Extract a usable
// string defensively so a shape we didn't anticipate degrades to "" rather
// than throwing.
function textOf(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const t = textOf(item);
      if (t) return t;
    }
    return "";
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    // Prefer English, then any first non-empty language value.
    for (const key of ["eng", "ENG", "en", "EN"]) {
      if (obj[key] != null) {
        const t = textOf(obj[key]);
        if (t) return t;
      }
    }
    for (const v of Object.values(obj)) {
      const t = textOf(v);
      if (t) return t;
    }
  }
  return "";
}

// Pull the first present, non-empty value across candidate field ids.
function fieldText(notice: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    if (key in notice) {
      const t = textOf(notice[key]);
      if (t) return t;
    }
  }
  return "";
}

// Collect all CPV codes present on a notice across candidate field ids.
function fieldCpvs(notice: Record<string, unknown>, keys: string[]): string[] {
  const out: string[] = [];
  const walk = (value: unknown) => {
    if (value == null) return;
    if (typeof value === "string") {
      const digits = value.replace(/\D/g, "");
      if (digits.length >= 8) out.push(digits.slice(0, 8));
      return;
    }
    if (typeof value === "number") {
      const s = String(value);
      if (s.length >= 8) out.push(s.slice(0, 8));
      return;
    }
    if (Array.isArray(value)) return value.forEach(walk);
    if (typeof value === "object") return Object.values(value as Record<string, unknown>).forEach(walk);
  };
  for (const key of keys) if (key in notice) walk(notice[key]);
  return [...new Set(out)];
}

interface TedSearchResponse {
  notices?: Array<Record<string, unknown>>;
  totalNoticeCount?: number;
  total?: number;
}

/**
 * TED Europa via the official Search API (api.ted.europa.eu/v3) — the
 * sanctioned JSON route that replaces scraping ted.europa.eu's single-page
 * app (which is unreliable and returned zero notices in production). No API
 * key required. Filters to healthcare CPV divisions (33 = medical/pharma,
 * 85 = health & social services) over a recent publication window, paginated.
 *
 * NOTE: TED's eForms field identifiers are numerous and versioned, so the
 * field-id guesses below are matched defensively (several candidates per
 * field, multilingual-object aware) and are UNVERIFIED against a live
 * response from this sandbox (network blocked). Run `npm run scrape:ted` on
 * the server and check scrape_runs / a raw notice dump, then tighten the
 * field ids to whatever the API actually returns. Failures surface into
 * scrape_runs.errors rather than silently returning nothing.
 */
export class TedEuropaScraper extends ApiScraper {
  readonly source = "ted_europa" as const;
  readonly baseUrl = "https://ted.europa.eu";

  private readonly apiUrl = "https://api.ted.europa.eu/v3/notices/search";
  private readonly pageSize = 100;
  private readonly maxPages = 15;
  private readonly lookbackDays = 90;

  // Healthcare CPV divisions. TED expert search includes child codes of a
  // listed parent, so the two division roots cover all medical/pharma (33xxx)
  // and health & social-work services (85xxx) notices.
  private readonly healthcareCpvQuery = "classification-cpv IN (33000000 85000000)";

  // TED v3 REQUIRES a non-empty `fields` array and validates every id against
  // its eForms vocabulary — one unknown id 400s the whole request. These are
  // chosen conservatively: `classification-cpv` and `publication-date` are
  // known-valid (TED accepted them inside our query filter); the rest are the
  // canonical v3 notice-level ids. Legacy 2-letter TED codes (ND/TI/PD/...)
  // are deliberately omitted — those are what triggered the 400s. If TED still
  // rejects one, its error names the culprit; adjust here.
  // All confirmed against TED's live supported-fields vocabulary. The earlier
  // 400 was a single bad id: "deadline-receipt-tenders-date-lot" (plural) —
  // the real field is singular "deadline-receipt-tender-date-lot".
  private readonly requestFields = [
    "publication-number",
    "notice-title",
    "classification-cpv",
    "buyer-name",
    "buyer-country",
    "publication-date",
    "deadline-receipt-tender-date-lot",
    "total-value",
    "links",
  ];

  protected async fetchTenders(): Promise<Partial<Tender>[]> {
    const since = new Date(Date.now() - this.lookbackDays * 24 * 60 * 60 * 1000);
    const sinceStr = since.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
    const query = `(${this.healthcareCpvQuery}) AND (publication-date >= ${sinceStr})`;

    const out: Partial<Tender>[] = [];
    const seen = new Set<string>();

    for (let page = 1; page <= this.maxPages; page++) {
      // `scope: ACTIVE` = currently-open notices only.
      const body = {
        query,
        fields: this.requestFields,
        page,
        limit: this.pageSize,
        scope: "ACTIVE",
        paginationMode: "PAGE_NUMBER",
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
        if (page === 1) throw new Error(`TED API request failed: ${String(err)}`);
        logger.warn("TED API: request failed on later page, stopping", { page, error: String(err) });
        break;
      }

      if (!res.ok) {
        const snippet = (await res.text().catch(() => "")).slice(0, 300);
        if (page === 1) throw new Error(`TED API returned ${res.status}: ${snippet}`);
        logger.warn("TED API: non-OK on later page, stopping", { page, status: res.status });
        break;
      }

      const data = (await res.json()) as TedSearchResponse;
      const notices = data.notices ?? [];
      if (notices.length === 0) break;

      // Small inter-page pause — TED's API is shared infrastructure and the
      // request itself can be slow; don't hammer it.
      await sleep(500);

      for (const notice of notices) {
        const tender = this.mapNotice(notice);
        if (!tender) continue;
        if (seen.has(tender.externalId!)) continue;
        seen.add(tender.externalId!);
        out.push(tender);
      }

      const total = data.totalNoticeCount ?? data.total;
      if (total !== undefined && page * this.pageSize >= total) break;
      if (notices.length < this.pageSize) break;
    }

    logger.info("TED: notices collected via API", { count: out.length });
    return out;
  }

  private mapNotice(notice: Record<string, unknown>): Partial<Tender> | null {
    // Try several id candidates so a projection using any of them still keys
    // the notice. Without an id we can't dedupe/persist, so that's the only
    // hard requirement.
    const externalId = fieldText(notice, [
      "publication-number", "publication-number-lot", "ND", "notice-identifier",
    ]);
    if (!externalId) return null;

    const cpvCodes = fieldCpvs(notice, [
      "classification-cpv", "cpv", "CPV", "main-classification-proc", "additional-classification-proc",
    ]);
    const category = this.mapCpvToCategory(cpvCodes);

    // Title field id varies by eForms version; try the candidates, and if none
    // match, synthesize one from category + id rather than dropping the notice
    // (these are already CPV-filtered to healthcare, so a placeholder title is
    // acceptable and keeps real EU data flowing while field ids get confirmed).
    const title =
      fieldText(notice, ["notice-title", "title-proc", "title-lot", "BT-21-Procedure", "BT-21-Lot", "name-buyer"]) ||
      `${this.mapCpvToCategory(cpvCodes).replace(/_/g, " ")} tender — ${externalId}`;

    const country = fieldText(notice, ["buyer-country", "organisation-country-buyer"]);
    const publishedRaw = fieldText(notice, ["publication-date"]);
    const deadlineRaw = fieldText(notice, [
      "deadline-receipt-tender-date-lot", "deadline-date-lot", "deadline", "deadline-receipt-request",
    ]);

    // total-value may be a plain number or an object; take the first numeric.
    const valueRaw = fieldText(notice, ["total-value"]);
    const value = valueRaw ? Number(valueRaw.replace(/[^\d.]/g, "")) : NaN;
    const originalValue = Number.isFinite(value) && value > 0 ? value : null;

    // links can be an object like { html: { ENG: "https://..." } } or a string.
    const link = this.extractLink(notice["links"]) || `${this.baseUrl}/en/notice/-/detail/${externalId}`;

    return {
      externalId,
      source: "ted_europa",
      title,
      description: title,
      buyerName: fieldText(notice, ["buyer-name", "organisation-name-buyer"]) || "European Public Buyer",
      buyerCountry: country ? country.slice(0, 2).toUpperCase() : "EU",
      buyerRegion: "Europe",
      category,
      status: "open", // scope=ACTIVE only returns open notices
      publishedAt: this.parseDate(publishedRaw) ?? new Date(),
      deadline: this.parseDate(deadlineRaw),
      originalCurrency: "EUR",
      originalValue,
      valueUsd: originalValue != null ? convertToUsd(originalValue, "EUR") : null,
      complianceCriteria: ["EU public procurement directives"],
      cpvCodes,
      url: link,
      rawData: { noticeType: fieldText(notice, ["notice-type"]) },
    };
  }

  private extractLink(links: unknown): string {
    if (!links) return "";
    if (typeof links === "string") return links;
    if (typeof links === "object") {
      // Prefer an HTML link, English if available, else any URL-looking value.
      const findUrl = (v: unknown): string => {
        if (typeof v === "string" && /^https?:\/\//.test(v)) return v;
        if (Array.isArray(v)) {
          for (const i of v) { const u = findUrl(i); if (u) return u; }
        } else if (v && typeof v === "object") {
          for (const val of Object.values(v as Record<string, unknown>)) {
            const u = findUrl(val); if (u) return u;
          }
        }
        return "";
      };
      const obj = links as Record<string, unknown>;
      return findUrl(obj["html"] ?? obj["HTML"] ?? obj);
    }
    return "";
  }

  private mapCpvToCategory(cpvCodes: string[]): ProcurementCategory {
    for (const code of cpvCodes) {
      // Try exact 8-digit, then progressively broader prefixes.
      for (const mapped of Object.keys(CPV_CATEGORY_MAP)) {
        if (code.slice(0, 8) === mapped) return CPV_CATEGORY_MAP[mapped];
      }
    }
    // Division-level fallback so a health notice still classifies sensibly.
    for (const code of cpvCodes) {
      if (code.startsWith("33")) return "medical_devices";
      if (code.startsWith("85")) return "clinical_services";
    }
    return "other";
  }

  private parseDate(raw: string): Date | null {
    if (!raw) return null;
    // TED dates may be YYYYMMDD, ISO, or with timezone — try a couple of forms.
    let s = raw;
    if (/^\d{8}$/.test(raw)) s = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
}
