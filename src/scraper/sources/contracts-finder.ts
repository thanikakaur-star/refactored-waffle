import { ApiScraper } from "../api-base.js";
import { convertToUsd } from "../../utils/currency.js";
import { classifyUkTender } from "./uk-category-map.js";
import { logger } from "../../utils/logger.js";
import type { Tender } from "../../types/index.js";
import type { PendingAward } from "../api-base.js";

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
  awards?: Array<{
    id?: string;
    date?: string;
    status?: string;
    value?: { amount?: number; currency?: string };
    suppliers?: Array<{ id?: string; name?: string }>;
  }>;
  buyer?: { name?: string };
}

// Same as Find a Tender: only extract confirmed awards, not pending ones.
function isFinalAward(status: string | undefined): boolean {
  return status === undefined || status === "active";
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

    const kept = releases.filter((r) => r.tender?.title);
    for (const r of kept) {
      const tenderExternalId = r.tender!.id ?? r.ocid ?? r.id ?? "";
      this.collectAwards(r, tenderExternalId);
    }
    return kept.map((r) => this.mapRelease(r));
  }

  private collectAwards(release: OcdsRelease, tenderExternalId: string): void {
    if (!tenderExternalId) return;
    for (const award of release.awards ?? []) {
      if (!isFinalAward(award.status) || !award.value?.amount) continue;
      const suppliers = award.suppliers?.length ? award.suppliers : [{ name: undefined }];
      suppliers.forEach((supplier, i) => {
        if (!supplier.name) return;
        const entry: PendingAward = {
          tenderExternalId,
          externalId: award.id ? `${award.id}-${supplier.id ?? i}` : undefined,
          source: "contracts_finder",
          awardDate: award.date ? new Date(award.date) : new Date(),
          supplierName: supplier.name,
          supplierCountry: "GB",
          originalCurrency: award.value?.currency ?? "GBP",
          awardValue: award.value!.amount!,
          awardValueUsd: convertToUsd(award.value!.amount!, award.value?.currency ?? "GBP") ?? undefined,
        };
        this.pendingAwards.push(entry);
      });
    }
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
