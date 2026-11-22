import { getSupabaseClient } from "../db/client.js";
import { logger } from "../utils/logger.js";

// Real provider data for the Fast-Track navigator. Three honest sources, no
// fabrication:
//  1. findCommissionedServices: suppliers/services actually commissioned in the
//     NHS for a category, from our procurement database (context, clearly labelled
//     as procurement records, not a bookable clinic directory).
//  2. cqcSearch: the free public CQC API. Returns real CQC-registered locations
//     linking to their authoritative CQC record (where the genuine rating lives).
//     Requires CQC_API_KEY (a CQC subscription/partner key); returns [] without it.
//  3. officialDirectoryLinks: deep links into the official NHS and CQC search,
//     pre-filled with the patient's postcode, as the always-authoritative source.

export interface CommissionedService {
  supplier: string;
  title: string;
  source: string;
  valueUsd: number | null;
  awardDate: string | null;
}

export interface CqcLocation {
  name: string;
  postalCode: string | null;
  region: string | null;
  cqcUrl: string | null;
}

export async function findCommissionedServices(category: string, limit = 8): Promise<CommissionedService[]> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("contract_awards")
      .select("supplier_name, tender_title, source, award_value_usd, award_date")
      .eq("category", category)
      .not("supplier_name", "is", null)
      .order("award_date", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map((a: any) => ({
      supplier: a.supplier_name,
      title: a.tender_title || "",
      source: a.source,
      valueUsd: a.award_value_usd ?? null,
      awardDate: a.award_date ?? null,
    }));
  } catch (err) {
    logger.warn("Fast-track commissioned-services query failed", { error: String(err), category });
    return [];
  }
}

export async function cqcSearch(limit = 8): Promise<CqcLocation[]> {
  const key = (process.env.CQC_API_KEY || "").trim();
  if (!key) return [];
  try {
    const url = new URL("https://api.cqc.org.uk/public/v1/locations");
    url.searchParams.set("perPage", "20");
    url.searchParams.set("page", "1");
    const res = await fetch(url.toString(), { headers: { "Ocp-Apim-Subscription-Key": key } });
    if (!res.ok) {
      logger.warn("CQC API non-OK", { status: res.status });
      return [];
    }
    const j = (await res.json()) as any;
    const locs = (j?.locations ?? []) as any[];
    return locs.slice(0, limit).map((l: any) => ({
      name: l.locationName || l.name || "CQC-registered location",
      postalCode: l.postalCode ?? null,
      region: l.region ?? null,
      cqcUrl: l.locationId ? `https://www.cqc.org.uk/location/${l.locationId}` : null,
    }));
  } catch (err) {
    logger.warn("CQC search failed", { error: String(err) });
    return [];
  }
}

export function officialDirectoryLinks(postcode: string) {
  const pc = (postcode || "").trim();
  const q = pc ? `?location=${encodeURIComponent(pc)}` : "";
  const cq = pc ? `?postcode=${encodeURIComponent(pc)}` : "";
  return {
    findPharmacy: `https://www.nhs.uk/service-search/pharmacy/find-a-pharmacy${q}`,
    nhsServices: "https://www.nhs.uk/service-search",
    cqcSearch: `https://www.cqc.org.uk/search/services${cq}`,
    rightToChoose: "https://www.nhs.uk/nhs-services/hospitals/choosing-a-hospital/your-legal-right-to-choose/",
    eReferral: "https://www.nhs.uk/nhs-services/hospitals/choosing-a-hospital/",
  };
}
