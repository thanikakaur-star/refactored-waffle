import { ApiScraper } from "../api-base.js";
import { convertToUsd } from "../../utils/currency.js";
import { classifyUkTender } from "./uk-category-map.js";
import { logger } from "../../utils/logger.js";
import type { Tender } from "../../types/index.js";

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
    documents?: Array<{ url?: string }>;
  };
  buyer?: { name?: string };
}

interface OcdsReleasePackage {
  releases?: OcdsRelease[];
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

/**
 * Find a Tender Service (find-tender.service.gov.uk) — UK central government
 * and above-threshold public contracts. Publishes an OCDS release-package
 * API. NOTE: the exact endpoint path/query params below are built from the
 * documented OCDS pattern but have NOT been verified against a live request
 * (this sandbox's network policy blocks the domain). Test against production
 * before trusting the output — if the endpoint is wrong, this will fail
 * loudly into scrape_runs.errors rather than silently returning nothing.
 */
export class FindATenderScraper extends ApiScraper {
  readonly source = "find_a_tender" as const;
  readonly baseUrl = "https://www.find-tender.service.gov.uk";

  private readonly apiUrl = `${this.baseUrl}/api/1.0/ocdsReleasePackages?limit=50&stages=tender`;

  protected async fetchTenders(): Promise<Partial<Tender>[]> {
    const res = await fetch(this.apiUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const bodySnippet = (await res.text().catch(() => "")).slice(0, 300);
      throw new Error(`Find a Tender API returned ${res.status}: ${bodySnippet}`);
    }

    const data = (await res.json()) as OcdsReleasePackage;
    const releases = data.releases ?? [];
    logger.info("Find a Tender: Fetched releases", { count: releases.length });

    return releases
      .filter((r) => r.tender?.title)
      .map((r) => this.mapRelease(r));
  }

  private mapRelease(release: OcdsRelease): Partial<Tender> {
    const tender = release.tender!;
    const title = tender.title ?? "";
    const description = tender.description ?? "";
    const value = tender.value;
    const documentUrl = tender.documents?.find((d) => d.url)?.url;

    return {
      externalId: tender.id ?? release.ocid ?? release.id ?? "",
      source: "find_a_tender",
      title,
      description,
      buyerName: release.buyer?.name || "UK Public Sector Buyer",
      buyerCountry: "GB",
      buyerRegion: "United Kingdom",
      category: classifyUkTender(title, description, tender.classification?.id),
      status: mapStatus(tender.status),
      publishedAt: release.date ? new Date(release.date) : new Date(),
      deadline: tender.tenderPeriod?.endDate ? new Date(tender.tenderPeriod.endDate) : null,
      originalCurrency: value?.currency ?? "GBP",
      originalValue: value?.amount ?? null,
      valueUsd: value?.amount ? convertToUsd(value.amount, value.currency ?? "GBP") : null,
      complianceCriteria: ["UK Public Contracts Regulations 2015"],
      cpvCodes: tender.classification?.id ? [tender.classification.id] : [],
      url: documentUrl || this.baseUrl,
      rawData: { ocid: release.ocid },
    };
  }
}
