import { ApiScraper, SCRAPER_USER_AGENT } from "../api-base.js";
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

  // Fields we ask TED to return. Superset of candidate ids across eForms
  // versions; the parser picks whichever are present.
  private readonly requestFields = [
    "publication-number", "ND",
    "notice-title", "title-proc", "TI", "BT-21-Procedure",
    "buyer-name", "AA", "BT-500-Business",
    "buyer-country", "CY", "country",
    "publication-date", "PD",
    "deadline-receipt-tenders-date-lot", "deadline-receipt-request", "DT",
    "classification-cpv", "CPV", "cpv",
    "notice-type", "TD",
    "links",
  ];

  // Healthcare CPV divisions. TED expert search includes child codes of a
  // listed parent, so the two division roots cover all medical/pharma (33xxx)
  // and health & social-work services (85xxx) notices.
  private readonly healthcareCpvQuery = "classification-cpv IN (33000000 85000000)";

  protected async fetchTenders(): Promise<Partial<Tender>[]> {
    const since = new Date(Date.now() - this.lookbackDays * 24 * 60 * 60 * 1000);
    const sinceStr = since.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
    const query = `(${this.healthcareCpvQuery}) AND (publication-date >= ${sinceStr})`;

    const out: Partial<Tender>[] = [];
    const seen = new Set<string>();

    for (let page = 1; page <= this.maxPages; page++) {
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
    const externalId = fieldText(notice, ["publication-number", "ND"]);
    const title = fieldText(notice, ["notice-title", "title-proc", "TI", "BT-21-Procedure"]);
    if (!externalId || !title) return null;

    const cpvCodes = fieldCpvs(notice, ["classification-cpv", "CPV", "cpv"]);
    const category = this.mapCpvToCategory(cpvCodes);

    const country = fieldText(notice, ["buyer-country", "CY", "country"]);
    const publishedRaw = fieldText(notice, ["publication-date", "PD"]);
    const deadlineRaw = fieldText(notice, [
      "deadline-receipt-tenders-date-lot", "deadline-receipt-request", "DT",
    ]);

    // links can be an object like { html: { ENG: "https://..." } } or a string.
    const link = this.extractLink(notice["links"]) || `${this.baseUrl}/en/notice/-/detail/${externalId}`;

    return {
      externalId,
      source: "ted_europa",
      title,
      description: fieldText(notice, ["notice-title", "title-proc"]) || title,
      buyerName: fieldText(notice, ["buyer-name", "AA", "BT-500-Business"]) || "European Public Buyer",
      buyerCountry: country ? country.slice(0, 2).toUpperCase() : "EU",
      buyerRegion: "Europe",
      category,
      status: "open", // scope=ACTIVE only returns open notices
      publishedAt: this.parseDate(publishedRaw) ?? new Date(),
      deadline: this.parseDate(deadlineRaw),
      originalCurrency: "EUR",
      originalValue: null,
      valueUsd: null,
      complianceCriteria: ["EU public procurement directives"],
      cpvCodes,
      url: link,
      rawData: { noticeType: fieldText(notice, ["notice-type", "TD"]) },
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
