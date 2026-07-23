import { ApiScraper } from "../api-base.js";
import { convertToUsd } from "../../utils/currency.js";
import { classifyUkTender } from "./uk-category-map.js";
import { logger } from "../../utils/logger.js";
import type { Tender, ProcurementCategory } from "../../types/index.js";
import type { PendingAward } from "../api-base.js";

interface OcdsClassification {
  id?: string;
  scheme?: string;
}
interface OcdsItem {
  classification?: OcdsClassification;
  additionalClassifications?: OcdsClassification[];
}
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
    classification?: OcdsClassification;
    items?: OcdsItem[];
    documents?: Array<{ url?: string }>;
  };
  awards?: Array<{
    id?: string;
    date?: string;
    status?: string;
    value?: { amount?: number; currency?: string };
    suppliers?: Array<{ id?: string; name?: string }>;
    items?: OcdsItem[];
  }>;
  buyer?: { name?: string };
}

// A CPV code can appear on the top-level tender.classification or on line
// items (tender.items[] / award.items[]) via classification /
// additionalClassifications. Collect every CPV across all of those so the
// healthcare filter doesn't miss notices that only tag CPV at item level.
// (Same approach as find-a-tender.ts.)
function collectCpvCodes(release: OcdsRelease): string[] {
  const codes: string[] = [];
  const push = (c?: OcdsClassification) => {
    if (c?.id && (c.scheme === undefined || /cpv/i.test(c.scheme))) codes.push(c.id);
  };
  const pushItem = (item: OcdsItem) => {
    push(item.classification);
    (item.additionalClassifications ?? []).forEach(push);
  };

  push(release.tender?.classification);
  (release.tender?.items ?? []).forEach(pushItem);
  (release.awards ?? []).forEach((a) => (a.items ?? []).forEach(pushItem));

  return [...new Set(codes)];
}

// Keep only healthcare-relevant notices: any CPV 33xxxxxx (medical equipment /
// pharmaceuticals) or 85xxxxxx (health & social work services) anywhere on the
// notice, or — when no health CPV is present — a keyword classification that
// isn't "other".
function isHealthcare(cpvCodes: string[], category: ProcurementCategory): boolean {
  for (const cpv of cpvCodes) {
    const digits = cpv.replace(/\D/g, "");
    if (digits.startsWith("33") || digits.startsWith("85")) return true;
  }
  return category !== "other";
}

// Same as Find a Tender: only extract confirmed awards, not pending ones.
function isFinalAward(status: string | undefined): boolean {
  return status === undefined || status === "active";
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

/**
 * Contracts Finder (contractsfinder.service.gov.uk) — UK local authority and
 * lower-value public sector contracts. Publishes an OCDS release-package
 * API, same shape as Find a Tender Service.
 *
 * Pulls notices published in the last `lookbackDays`, newest first, following
 * cursor pagination up to `maxPages`, and keeps only healthcare-relevant
 * notices (CPV 33xx/85xx anywhere, or a non-"other" keyword classification).
 *
 * NOTE: as with find-a-tender.ts, the exact endpoint/params here are
 * unverified against a live request due to this sandbox's network policy —
 * test against production before relying on it. Failures surface into
 * scrape_runs.errors rather than silently returning nothing.
 */
export class ContractsFinderScraper extends ApiScraper {
  readonly source = "contracts_finder" as const;
  readonly baseUrl = "https://www.contractsfinder.service.gov.uk";

  private readonly pageLimit = 100;
  private readonly maxPages = 20;
  private readonly lookbackDays = 60;

  protected async fetchTenders(): Promise<Partial<Tender>[]> {
    const publishedFrom = new Date(Date.now() - this.lookbackDays * 24 * 60 * 60 * 1000).toISOString();
    let url: string | undefined =
      `${this.baseUrl}/Published/Notices/OCDS/Search` +
      `?order=desc%3ApublishedDate&limit=${this.pageLimit}` +
      `&publishedFrom=${encodeURIComponent(publishedFrom)}`;

    const out: Partial<Tender>[] = [];
    const seen = new Set<string>();
    let totalReleases = 0;

    for (let page = 0; page < this.maxPages && url; page++) {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        const bodySnippet = (await res.text().catch(() => "")).slice(0, 300);
        // First page failing is a hard error; a later page failing shouldn't
        // throw away everything already collected — stop paginating instead.
        if (page === 0) {
          throw new Error(`Contracts Finder API returned ${res.status}: ${bodySnippet}`);
        }
        logger.warn("Contracts Finder: non-OK on later page, stopping pagination", { page, status: res.status });
        break;
      }

      const data = (await res.json()) as OcdsReleasePackage;
      const releases = data.releases ?? [];
      totalReleases += releases.length;

      for (const r of releases) {
        if (!r.tender?.title) continue;
        const cpvCodes = collectCpvCodes(r);
        const healthCpv = cpvCodes.find((c) => {
          const d = c.replace(/\D/g, "");
          return d.startsWith("33") || d.startsWith("85");
        });
        const category = classifyUkTender(
          r.tender.title,
          r.tender.description ?? "",
          healthCpv ?? cpvCodes[0],
        );
        if (!isHealthcare(cpvCodes, category)) continue;

        const externalId = r.tender.id ?? r.ocid ?? r.id ?? "";
        if (!externalId || seen.has(externalId)) continue;
        seen.add(externalId);

        out.push(this.mapRelease(r, category, cpvCodes));
        this.collectAwards(r, externalId);
      }

      url = data.links?.next;
    }

    logger.info("Contracts Finder: healthcare tenders collected", {
      kept: out.length,
      releasesScanned: totalReleases,
    });
    return out;
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

  private mapRelease(release: OcdsRelease, category: ProcurementCategory, cpvCodes: string[]): Partial<Tender> {
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
      category,
      status: mapStatus(tender.status),
      publishedAt: release.date ? new Date(release.date) : new Date(),
      deadline: tender.tenderPeriod?.endDate ? new Date(tender.tenderPeriod.endDate) : null,
      originalCurrency: value?.currency ?? "GBP",
      originalValue: value?.amount ?? null,
      valueUsd: value?.amount ? convertToUsd(value.amount, value.currency ?? "GBP") : null,
      complianceCriteria: ["UK Public Contracts Regulations 2015"],
      cpvCodes,
      url: documentUrl || this.baseUrl,
      rawData: { ocid: release.ocid },
    };
  }
}
