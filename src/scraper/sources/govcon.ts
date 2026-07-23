import { ApiScraper, SCRAPER_USER_AGENT } from "../api-base.js";
import { convertToUsd } from "../../utils/currency.js";
import { logger } from "../../utils/logger.js";
import type { Tender, ProcurementCategory } from "../../types/index.js";

// Healthcare-relevant NAICS codes → our categories. Same mapping used for
// SAM.gov since govconapi.com aggregates the same federal opportunity data
// (it fronts SAM.gov + related feeds behind one API/key).
const NAICS_CATEGORY_MAP: Record<string, ProcurementCategory> = {
  "339112": "medical_devices",
  "339113": "surgical_instruments",
  "339114": "diagnostics",
  "325411": "pharmaceuticals",
  "325412": "pharmaceuticals",
  "334510": "health_it",
  "334516": "diagnostics",
  "621999": "telemedicine",
  "236220": "hospital_infrastructure",
  "339920": "personal_protective_equipment",
};

// Notice types worth ingesting — matches the vendor's documented
// notice_type values (Solicitation, Presolicitation, Award Notice, Sources
// Sought). "Award Notice" carries award-side data we fork into pendingAwards.
const NOTICE_TYPES = ["Solicitation", "Presolicitation", "Sources Sought", "Award Notice"];

interface GovconContact {
  name?: string;
  email?: string;
  phone?: string;
}

interface GovconAward {
  amount?: number;
  awardee_name?: string;
  awardee_country?: string;
  award_date?: string;
  duration?: string;
}

interface GovconAttachment {
  name?: string;
  url?: string;
}

// govconapi.com response shape — built from the documented request
// (Bearer auth, naics/psc/keywords/notice_type filters) and the vendor's
// own description of what each record contains (full notice, contacts,
// descriptions, award data, attachment links). NOT yet verified against a
// live response from this environment — this sandbox's network policy
// blocks govconapi.com, so field names below are best-effort from the docs
// page and common GovCon aggregator conventions. Run once with a real key
// on a machine with network access and check scrape_runs / a raw response
// dump before trusting this in production; adjust field names to match.
interface GovconOpportunity {
  notice_id?: string;
  solicitation_number?: string;
  title?: string;
  agency?: string;
  office?: string;
  notice_type?: string;
  naics_code?: string;
  psc_code?: string;
  posted_date?: string;
  response_deadline?: string;
  description?: string;
  place_of_performance_country?: string;
  active?: boolean;
  url?: string;
  contacts?: GovconContact[];
  award?: GovconAward;
  attachments?: GovconAttachment[];
}

interface GovconSearchResponse {
  data?: GovconOpportunity[];
  results?: GovconOpportunity[];
  total?: number;
}

function mapStatus(active: boolean | undefined, noticeType: string | undefined): "open" | "closed" | "awarded" | "planned" {
  const t = (noticeType ?? "").toLowerCase();
  if (t.includes("award")) return "awarded";
  if (t.includes("presolicitation") || t.includes("sources sought")) return "planned";
  if (active === false) return "closed";
  return "open";
}

/**
 * GovCon API (govconapi.com) — third-party aggregator over U.S. federal
 * contracting opportunities (SAM.gov-sourced + related feeds), keyed by
 * NAICS/PSC/keyword/notice_type per https://govconapi.com/api-guide.
 * Requires GOVCON_API_KEY, sent as `Authorization: Bearer <key>`.
 *
 * This is a paid third-party service, not a primary government source —
 * verify data freshness/coverage/ToS before relying on it in production.
 * Without the key this no-ops loudly into scrape_runs.errors, same as the
 * SAM.gov scraper.
 */
export class GovconScraper extends ApiScraper {
  readonly source = "sam_gov" as const;
  readonly baseUrl = "https://govconapi.com";

  private readonly apiUrl = "https://govconapi.com/api/v1/opportunities/search";
  private readonly pageSize = 50;
  private readonly maxPagesPerQuery = 10;

  protected async fetchTenders(): Promise<Partial<Tender>[]> {
    const apiKey = process.env.GOVCON_API_KEY;
    if (!apiKey) {
      throw new Error("GOVCON_API_KEY not set — get a key at https://govconapi.com and add it to your env.");
    }

    const tenders: Partial<Tender>[] = [];
    const seen = new Set<string>();

    for (const [naics, category] of Object.entries(NAICS_CATEGORY_MAP)) {
      for (const noticeType of NOTICE_TYPES) {
        // Paginate this NAICS+notice_type combination. `page` is 1-based; the
        // exact param name isn't documented, so a zero-new-results guard below
        // stops us cleanly if the API ignores it and just re-serves page 1
        // (rather than looping maxPagesPerQuery times over identical data).
        for (let page = 1; page <= this.maxPagesPerQuery; page++) {
          const params = new URLSearchParams({
            naics,
            notice_type: noticeType,
            limit: String(this.pageSize),
            page: String(page),
          });

          let res: Response;
          try {
            res = await fetch(`${this.apiUrl}?${params.toString()}`, {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                Accept: "application/json",
                "User-Agent": SCRAPER_USER_AGENT,
              },
              signal: AbortSignal.timeout(30000),
            });
          } catch (err) {
            logger.warn("GovCon API: request failed", { naics, noticeType, page, error: String(err) });
            break;
          }

          if (!res.ok) {
            const snippet = (await res.text().catch(() => "")).slice(0, 200);
            if (res.status === 401 || res.status === 403 || res.status === 429) {
              throw new Error(`GovCon API ${res.status}: ${snippet}`);
            }
            logger.warn("GovCon API: non-OK response", { naics, noticeType, page, status: res.status });
            break;
          }

          const data = (await res.json()) as GovconSearchResponse;
          const opportunities = data.data ?? data.results ?? [];
          if (opportunities.length === 0) break;

          let newThisPage = 0;
          for (const opp of opportunities) {
            const id = opp.notice_id ?? opp.solicitation_number ?? "";
            if (!id || seen.has(id)) continue;
            seen.add(id);
            newThisPage++;
            tenders.push(this.mapOpportunity(opp, category));

            if (opp.award?.amount) {
              this.pendingAwards.push({
                tenderExternalId: id,
                awardDate: opp.award.award_date ? new Date(opp.award.award_date) : new Date(),
                supplierName: opp.award.awardee_name || "Unknown Supplier",
                supplierCountry: opp.award.awardee_country || "US",
                originalCurrency: "USD",
                awardValue: opp.award.amount,
                awardValueUsd: convertToUsd(opp.award.amount, "USD") ?? opp.award.amount,
                frameworkType: null,
                duration: opp.award.duration || null,
                source: "sam_gov",
              });
            }
          }

          // Stop if the page added nothing new (pagination param ignored, or
          // fully-overlapping data), the total is exhausted, or it was short.
          if (newThisPage === 0) break;
          const total = data.total;
          if (total !== undefined && page * this.pageSize >= total) break;
          if (opportunities.length < this.pageSize) break;
        }
      }
    }

    logger.info("GovCon API: fetched opportunities", { count: tenders.length });
    return tenders;
  }

  private mapOpportunity(opp: GovconOpportunity, category: ProcurementCategory): Partial<Tender> {
    return {
      externalId: opp.notice_id ?? opp.solicitation_number ?? "",
      source: "sam_gov",
      title: opp.title ?? "",
      description: opp.description ?? "",
      buyerName: opp.office || opp.agency || "U.S. Federal Agency",
      buyerCountry: opp.place_of_performance_country || "US",
      buyerRegion: "North America",
      category,
      status: mapStatus(opp.active, opp.notice_type),
      publishedAt: opp.posted_date ? new Date(opp.posted_date) : new Date(),
      deadline: opp.response_deadline ? new Date(opp.response_deadline) : null,
      originalCurrency: "USD",
      originalValue: opp.award?.amount ?? null,
      valueUsd: opp.award?.amount != null ? convertToUsd(opp.award.amount, "USD") : null,
      complianceCriteria: ["FAR compliance", "SAM.gov registration"],
      cpvCodes: [opp.naics_code, opp.psc_code].filter((c): c is string => !!c),
      url: opp.url || `${this.baseUrl}/opportunities/${opp.notice_id}`,
      rawData: {
        noticeType: opp.notice_type,
        naicsCode: opp.naics_code,
        pscCode: opp.psc_code,
        contacts: opp.contacts,
        attachments: opp.attachments,
      },
    };
  }
}
