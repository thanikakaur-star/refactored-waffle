import { ApiScraper, SCRAPER_USER_AGENT } from "../api-base.js";
import { convertToUsd } from "../../utils/currency.js";
import { classifyUkTender } from "./uk-category-map.js";
import { logger } from "../../utils/logger.js";
import type { Tender, ProcurementCategory } from "../../types/index.js";
import type { PendingAward } from "../api-base.js";

// NHS Supply Chain's contracting entity is Supply Chain Coordination Limited
// (SCCL). Its notices are published on the UK Find a Tender Service via the
// same OCDS release-package API used by find-a-tender.ts. This scraper queries
// that feed and keeps only notices whose buyer is NHS Supply Chain / SCCL,
// persisting them under the nhs_supply_chain source.
//
// NOTE: these notices may also be picked up by the general find_a_tender
// scraper (under its own source). Because persistence dedupes on
// (source, external_id), the two are stored independently — this source is a
// curated NHS-Supply-Chain-buyer view, which is what the platform advertises
// as a distinct source. Endpoint/params mirror find-a-tender.ts and are
// likewise unverified against a live request from this sandbox; failures
// surface into scrape_runs.errors.

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
interface OcdsReleasePackage {
  releases?: OcdsRelease[];
  links?: { next?: string };
}

// Buyer-name signatures that identify an NHS Supply Chain / SCCL notice.
const NHS_SC_BUYER = /supply chain coordination|nhs supply chain|\bsccl\b/i;

function isFinalAward(status: string | undefined): boolean {
  return status === undefined || status === "active";
}

function collectCpvCodes(release: OcdsRelease): string[] {
  const codes: string[] = [];
  const push = (c?: OcdsClassification) => {
    if (c?.id && (c.scheme === undefined || /cpv/i.test(c.scheme))) codes.push(c.id);
  };
  push(release.tender?.classification);
  (release.tender?.items ?? []).forEach((item) => {
    push(item.classification);
    (item.additionalClassifications ?? []).forEach(push);
  });
  return [...new Set(codes)];
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

export class NHSSupplyChainScraper extends ApiScraper {
  readonly source = "nhs_supply_chain" as const;
  readonly baseUrl = "https://www.find-tender.service.gov.uk";

  private readonly pageLimit = 100;
  private readonly maxPages = 15;
  private readonly lookbackDays = 90;

  protected async fetchTenders(): Promise<Partial<Tender>[]> {
    const updatedFrom = new Date(Date.now() - this.lookbackDays * 24 * 60 * 60 * 1000).toISOString();
    let url: string | undefined =
      `${this.baseUrl}/api/1.0/ocdsReleasePackages` +
      `?limit=${this.pageLimit}&updatedFrom=${encodeURIComponent(updatedFrom)}`;

    const out: Partial<Tender>[] = [];
    const seen = new Set<string>();
    let scanned = 0;

    for (let page = 0; page < this.maxPages && url; page++) {
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": SCRAPER_USER_AGENT },
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        const snippet = (await res.text().catch(() => "")).slice(0, 300);
        if (page === 0) throw new Error(`NHS Supply Chain (FTS) returned ${res.status}: ${snippet}`);
        logger.warn("NHS Supply Chain: non-OK on later page, stopping", { page, status: res.status });
        break;
      }

      const data = (await res.json()) as OcdsReleasePackage;
      const releases = data.releases ?? [];
      scanned += releases.length;

      for (const r of releases) {
        if (!r.tender?.title) continue;
        // The defining filter: buyer must be NHS Supply Chain / SCCL.
        if (!NHS_SC_BUYER.test(r.buyer?.name ?? "")) continue;

        const cpvCodes = collectCpvCodes(r);
        const healthCpv = cpvCodes.find((c) => {
          const d = c.replace(/\D/g, "");
          return d.startsWith("33") || d.startsWith("85");
        });
        const category = classifyUkTender(r.tender.title, r.tender.description ?? "", healthCpv ?? cpvCodes[0]);

        const externalId = r.id ?? r.ocid ?? r.tender.id ?? "";
        if (!externalId || seen.has(externalId)) continue;
        seen.add(externalId);

        out.push(this.mapRelease(r, category, cpvCodes));
        this.collectAwards(r, externalId);
      }

      url = data.links?.next;
    }

    logger.info("NHS Supply Chain: notices collected", { kept: out.length, releasesScanned: scanned });
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
          source: "nhs_supply_chain",
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
    const value = tender.value;
    const noticeId = release.id;
    const url = noticeId
      ? `${this.baseUrl}/Notice/${noticeId}`
      : `${this.baseUrl}/Search?keywords=${encodeURIComponent(tender.title ?? "")}`;

    return {
      externalId: noticeId ?? release.ocid ?? tender.id ?? "",
      source: "nhs_supply_chain",
      title: tender.title ?? "",
      description: tender.description ?? "",
      buyerName: release.buyer?.name || "NHS Supply Chain (SCCL)",
      buyerCountry: "GB",
      buyerRegion: "United Kingdom",
      category,
      status: mapStatus(tender.status),
      publishedAt: release.date ? new Date(release.date) : new Date(),
      deadline: tender.tenderPeriod?.endDate ? new Date(tender.tenderPeriod.endDate) : null,
      originalCurrency: value?.currency ?? "GBP",
      originalValue: value?.amount ?? null,
      valueUsd: value?.amount ? convertToUsd(value.amount, value.currency ?? "GBP") : null,
      complianceCriteria: ["UK Public Contracts Regulations 2015", "NHS commercial standards"],
      cpvCodes,
      url,
      rawData: { ocid: release.ocid, buyer: release.buyer?.name },
    };
  }
}
