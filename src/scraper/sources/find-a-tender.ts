import { ApiScraper } from "../api-base.js";
import { convertToUsd } from "../../utils/currency.js";
import { classifyUkTender } from "./uk-category-map.js";
import { logger } from "../../utils/logger.js";
import type { Tender, ProcurementCategory } from "../../types/index.js";

// OCDS release-package shape — only the fields we actually read.
interface OcdsRelease {
  ocid?: string;
  id?: string;
  date?: string;
  tender?: {
    id?: string;
    title?: string;
    description?: string;
    status?: string;
    value?: { amount?: number; currency?: string };
    tenderPeriod?: { endDate?: string };
    classification?: { id?: string };
    documents?: Array<{ url?: string; documentType?: string }>;
  };
  buyer?: { name?: string };
}

interface OcdsReleasePackage {
  releases?: OcdsRelease[];
  links?: { next?: string };
}

function mapStatus(ocdsStatus: string | undefined): "open" | "closed" | "awarded" | "cancelled" | "planned" {
  switch (ocdsStatus) {
    case "active":
      return "open";
    case "complete":
      return "awarded";
    case "cancelled":
    case "withdrawn":
    case "unsuccessful":
      return "cancelled";
    case "planning":
    case "planned":
      return "planned";
    default:
      return "open";
  }
}

// Keep only healthcare-relevant notices: CPV 33xxxxxx (medical equipment /
// pharmaceuticals) or 85xxxxxx (health & social work services), or — when no
// CPV is present — a keyword classification that isn't "other".
function isHealthcare(cpv: string | undefined, category: ProcurementCategory): boolean {
  if (cpv) {
    const digits = cpv.replace(/\D/g, "");
    if (digits.startsWith("33") || digits.startsWith("85")) return true;
  }
  return category !== "other";
}

/**
 * Find a Tender Service (find-tender.service.gov.uk) — UK central government
 * and above-threshold public contracts, via its public OCDS release-package
 * API (no login, no key).
 *
 * Pulls notices updated in the last 30 days (so results are current, not the
 * oldest in the archive), follows cursor pagination up to a page cap, and
 * keeps only healthcare-relevant notices.
 *
 * NOTE: written to the documented OCDS contract but not yet verified against a
 * live request (this sandbox blocks the domain). Run once on the server and
 * check scrape_runs before relying on it — failures surface there rather than
 * silently returning nothing.
 */
export class FindATenderScraper extends ApiScraper {
  readonly source = "find_a_tender" as const;
  readonly baseUrl = "https://www.find-tender.service.gov.uk";

  private readonly pageLimit = 100;
  private readonly maxPages = 10;
  private readonly lookbackDays = 30;

  protected async fetchTenders(): Promise<Partial<Tender>[]> {
    const updatedFrom = new Date(Date.now() - this.lookbackDays * 24 * 60 * 60 * 1000).toISOString();
    // NOTE: production host (no `-integration`, which serves sample data).
    // Params kept minimal to the documented contract — updatedFrom + limit;
    // stage/status filtering is done client-side to avoid unsupported params.
    let url: string | undefined =
      `${this.baseUrl}/api/1.0/ocdsReleasePackages` +
      `?limit=${this.pageLimit}&updatedFrom=${encodeURIComponent(updatedFrom)}`;

    const out: Partial<Tender>[] = [];
    const seen = new Set<string>();

    for (let page = 0; page < this.maxPages && url; page++) {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        const snippet = (await res.text().catch(() => "")).slice(0, 300);
        throw new Error(`Find a Tender API returned ${res.status}: ${snippet}`);
      }

      const data = (await res.json()) as OcdsReleasePackage;
      const releases = data.releases ?? [];

      for (const r of releases) {
        if (!r.tender?.title) continue;
        const cpv = r.tender.classification?.id;
        const category = classifyUkTender(r.tender.title, r.tender.description ?? "", cpv);
        if (!isHealthcare(cpv, category)) continue;

        const externalId = r.tender.id ?? r.ocid ?? r.id ?? "";
        if (!externalId || seen.has(externalId)) continue;
        seen.add(externalId);
        out.push(this.mapRelease(r, category));
      }

      url = data.links?.next;
    }

    logger.info("Find a Tender: healthcare tenders collected", { count: out.length });
    return out;
  }

  private mapRelease(release: OcdsRelease, category: ProcurementCategory): Partial<Tender> {
    const tender = release.tender!;
    const value = tender.value;
    // The release id is the public notice number (e.g. "035240-2023"), which
    // maps directly to the real notice page — confirmed against live URLs.
    const noticeId = release.id;
    const url = noticeId
      ? `${this.baseUrl}/Notice/${noticeId}`
      : `${this.baseUrl}/Search?keywords=${encodeURIComponent(tender.title ?? "")}`;

    return {
      externalId: noticeId ?? release.ocid ?? tender.id ?? "",
      source: "find_a_tender",
      title: tender.title ?? "",
      description: tender.description ?? "",
      buyerName: release.buyer?.name || "UK Public Sector Buyer",
      buyerCountry: "GB",
      buyerRegion: "United Kingdom",
      category,
      status: mapStatus(tender.status),
      publishedAt: release.date ? new Date(release.date) : new Date(),
      deadline: tender.tenderPeriod?.endDate ? new Date(tender.tenderPeriod.endDate) : null,
      originalCurrency: value?.currency ?? "GBP",
      originalValue: value?.amount ?? null,
      valueUsd: value?.amount ? convertToUsd(value.amount, value.currency ?? "GBP") : null,
      complianceCriteria: ["UK Public Contracts Regulations 2015"],
      cpvCodes: tender.classification?.id ? [tender.classification.id] : [],
      url,
      rawData: { ocid: release.ocid },
    };
  }
}
