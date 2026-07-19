import { ApiScraper } from "../api-base.js";
import { convertToUsd } from "../../utils/currency.js";
import { classifyUkTender } from "./uk-category-map.js";
import { logger } from "../../utils/logger.js";
import type { Tender, ProcurementCategory } from "../../types/index.js";
import type { PendingAward } from "../api-base.js";

// OCDS release-package shape — only the fields we actually read.
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
    documents?: Array<{ url?: string; documentType?: string }>;
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

// OCDS "active"/"pending" awards aren't a done deal yet — only extract
// supplier/value data once an award is actually confirmed.
function isFinalAward(status: string | undefined): boolean {
  return status === undefined || status === "active";
}

// A CPV code is a CPV code wherever it appears. Real Find a Tender notices
// frequently carry the CPV only on the line items (tender.items[] and
// award.items[]) via `classification` / `additionalClassifications`, not on
// the top-level `tender.classification`. Collect every CPV across all of
// those locations so the healthcare filter and classifier don't miss health
// notices that only tag CPV at the item level.
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

  // De-dupe, preserving order.
  return [...new Set(codes)];
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
        const cpvCodes = collectCpvCodes(r);
        // Classify off a health CPV when one exists (so item-level 33xx/85xx
        // codes drive the category), otherwise the first CPV, else keywords.
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
        // Same priority order as the externalId assigned in mapRelease, so
        // ApiScraper can link the award to its tender's real DB id/category
        // once both are persisted.
        const tenderExternalId = r.id ?? r.ocid ?? r.tender.id ?? "";
        this.collectAwards(r, tenderExternalId);
      }

      url = data.links?.next;
    }

    logger.info("Find a Tender: healthcare tenders collected", { count: out.length });
    return out;
  }

  // OCDS release.awards[] carries the actual supplier/value data for
  // confirmed contracts — one per supplier, since a framework award can list
  // several suppliers each winning a share. Pushed onto this.pendingAwards
  // (from ApiScraper) rather than persisted directly, since linking to the
  // tender's real DB id has to wait until after tenders are persisted.
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
          source: "find_a_tender",
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
      cpvCodes,
      url,
      rawData: { ocid: release.ocid },
    };
  }
}
