import { ApiScraper } from "../api-base.js";
import { convertToUsd } from "../../utils/currency.js";
import { classifyUkTender } from "./uk-category-map.js";
import { logger } from "../../utils/logger.js";
import type { Tender } from "../../types/index.js";

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
 * Contracts Finder (contractsfinder.service.gov.uk) — UK local authority and
 * lower-value public sector contracts. Publishes an OCDS release-package
 * API, same shape as Find a Tender Service. NOTE: as with find-a-tender.ts,
 * the exact endpoint/params here are unverified against a live request due
 * to this sandbox's network policy — test against production before relying
 * on it. Failures surface into scrape_runs.errors rather than silently
 * returning nothing.
 */
export class ContractsFinderScraper extends ApiScraper {
  readonly source = "contracts_finder" as const;
  readonly baseUrl = "https://www.contractsfinder.service.gov.uk";

  private readonly apiUrl = `${this.baseUrl}/Published/Notices/OCDS/Search?order=asc%3ApublishedDate&limit=50`;

  protected async fetchTenders(): Promise<Partial<Tender>[]> {
    const res = await fetch(this.apiUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const bodySnippet = (await res.text().catch(() => "")).slice(0, 300);
      throw new Error(`Contracts Finder API returned ${res.status}: ${bodySnippet}`);
    }

    const data = (await res.json()) as OcdsReleasePackage;
    const releases = data.releases ?? [];
    logger.info("Contracts Finder: Fetched releases", { count: releases.length });

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
      source: "contracts_finder",
      title,
      description,
      buyerName: release.buyer?.name || "UK Local Authority / Public Buyer",
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
