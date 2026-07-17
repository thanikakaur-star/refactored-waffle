import { ApiScraper } from "../api-base.js";
import { convertToUsd } from "../../utils/currency.js";
import { logger } from "../../utils/logger.js";
import type { Tender, ProcurementCategory } from "../../types/index.js";

// Healthcare-relevant NAICS codes → our categories. We query the official
// SAM.gov API per code so results are precise and API-sanctioned (no scraping).
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

interface SamOpportunity {
  noticeId?: string;
  title?: string;
  solicitationNumber?: string;
  fullParentPathName?: string;
  postedDate?: string;
  type?: string;
  baseType?: string;
  responseDeadLine?: string;
  naicsCode?: string;
  classificationCode?: string;
  active?: string;
  description?: string;
  uiLink?: string;
  award?: { amount?: string };
  placeOfPerformance?: { country?: { code?: string } };
}

interface SamResponse {
  totalRecords?: number;
  opportunitiesData?: SamOpportunity[];
}

function mmddyyyy(d: Date): string {
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getUTCFullYear()}`;
}

function mapStatus(active: string | undefined, type: string | undefined): "open" | "closed" | "awarded" | "planned" {
  if (active && active.toLowerCase() === "no") return "closed";
  const t = (type ?? "").toLowerCase();
  if (t.includes("award")) return "awarded";
  if (t.includes("presolicitation") || t.includes("sources sought") || t.includes("special notice")) return "planned";
  return "open";
}

/**
 * SAM.gov via the official Get Opportunities API (api.sam.gov) — the
 * sanctioned, login-free route. NOT UI scraping (which SAM.gov's terms
 * prohibit). Requires a free API key from https://api.data.gov, set as
 * SAM_GOV_API_KEY. Without the key this no-ops loudly into scrape_runs.errors.
 *
 * NOTE: written to the documented API contract but not yet verified against a
 * live key from this environment — run once on the server and check
 * scrape_runs before relying on it.
 */
export class SamGovScraper extends ApiScraper {
  readonly source = "sam_gov" as const;
  readonly baseUrl = "https://sam.gov";

  private readonly apiUrl = "https://api.sam.gov/opportunities/v2/search";

  protected async fetchTenders(): Promise<Partial<Tender>[]> {
    const apiKey = process.env.SAM_GOV_API_KEY;
    if (!apiKey) {
      throw new Error("SAM_GOV_API_KEY not set — get a free key at https://api.data.gov and add it to your env.");
    }

    const postedTo = new Date();
    const postedFrom = new Date(postedTo.getTime() - 90 * 24 * 60 * 60 * 1000);

    const tenders: Partial<Tender>[] = [];
    const seen = new Set<string>();

    for (const [naics, category] of Object.entries(NAICS_CATEGORY_MAP)) {
      const params = new URLSearchParams({
        api_key: apiKey,
        postedFrom: mmddyyyy(postedFrom),
        postedTo: mmddyyyy(postedTo),
        ncode: naics,
        limit: "50",
      });

      let res: Response;
      try {
        res = await fetch(`${this.apiUrl}?${params.toString()}`, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(30000),
        });
      } catch (err) {
        logger.warn("SAM.gov: request failed for NAICS", { naics, error: String(err) });
        continue;
      }

      if (!res.ok) {
        const snippet = (await res.text().catch(() => "")).slice(0, 200);
        // A bad key / rate limit affects every code — fail loudly rather than loop.
        if (res.status === 401 || res.status === 403 || res.status === 429) {
          throw new Error(`SAM.gov API ${res.status}: ${snippet}`);
        }
        logger.warn("SAM.gov: non-OK for NAICS", { naics, status: res.status });
        continue;
      }

      const data = (await res.json()) as SamResponse;
      for (const opp of data.opportunitiesData ?? []) {
        const id = opp.noticeId ?? opp.solicitationNumber ?? "";
        if (!id || seen.has(id)) continue;
        seen.add(id);
        tenders.push(this.mapOpportunity(opp, category));
      }
    }

    logger.info("SAM.gov: fetched opportunities", { count: tenders.length });
    return tenders;
  }

  private mapOpportunity(opp: SamOpportunity, category: ProcurementCategory): Partial<Tender> {
    const amount = opp.award?.amount ? Number(opp.award.amount) : null;
    const countryCode = opp.placeOfPerformance?.country?.code;

    return {
      externalId: opp.noticeId ?? opp.solicitationNumber ?? "",
      source: "sam_gov",
      title: opp.title ?? "",
      description: opp.fullParentPathName ?? "",
      buyerName: opp.fullParentPathName?.split(".")[0] || "U.S. Federal Agency",
      buyerCountry: countryCode && countryCode.length <= 3 ? countryCode : "US",
      buyerRegion: "North America",
      category,
      status: mapStatus(opp.active, opp.type ?? opp.baseType),
      publishedAt: opp.postedDate ? new Date(opp.postedDate) : new Date(),
      deadline: opp.responseDeadLine ? new Date(opp.responseDeadLine) : null,
      originalCurrency: "USD",
      originalValue: amount,
      valueUsd: amount != null ? convertToUsd(amount, "USD") : null,
      complianceCriteria: ["FAR compliance", "SAM.gov registration"],
      cpvCodes: opp.naicsCode ? [opp.naicsCode] : [],
      url: opp.uiLink || `${this.baseUrl}/opp/${opp.noticeId}/view`,
      rawData: { type: opp.type, naicsCode: opp.naicsCode, classificationCode: opp.classificationCode },
    };
  }
}
