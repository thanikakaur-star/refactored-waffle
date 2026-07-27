import { ApiScraper, SCRAPER_USER_AGENT } from "../api-base.js";
import { classifyUkTender } from "./uk-category-map.js";
import { regionForCountry } from "../regions.js";
import { logger } from "../../utils/logger.js";
import type { Tender, ProcurementCategory } from "../../types/index.js";

// World Bank procurement-notices API response shape — confirmed against a live
// response from https://search.worldbank.org/api/v2/procnotices. `procnotices`
// is a direct array (NOT { procnotice: [] }), and the per-notice field names
// are as below (noticedate / submission_date, not publication_date /
// submission_deadline_date; no sector/region fields).
interface ProcNotice {
  id?: string;
  notice_type?: string;         // e.g. "Contract Award", "Invitation for Bids"
  notice_status?: string;       // e.g. "Published"
  noticedate?: string;          // publication date, "22-Jul-2026"
  submission_date?: string;     // deadline, ISO "2026-07-22T00:00:00Z"
  project_id?: string;
  project_name?: string;
  project_ctry_name?: string;   // full country name, e.g. "Turkiye"
  bid_reference_no?: string;
  bid_description?: string;
  procurement_group?: string;   // e.g. "GO" (goods), "CW", "CS"
  procurement_method_name?: string;
  notice_text?: string;         // HTML blob
}

interface ProcNoticesResponse {
  total?: number | string;
  procnotices?: ProcNotice[];
}

// notice_type of a "Contract Award" is an award; otherwise infer open/closed
// from the submission deadline.
function mapStatus(notice: ProcNotice): "open" | "closed" | "awarded" {
  if (/award/i.test(notice.notice_type ?? "")) return "awarded";
  const deadline = notice.submission_date;
  if (!deadline) return "open";
  const t = new Date(deadline).getTime();
  return Number.isNaN(t) || t > Date.now() ? "open" : "closed";
}

// World Bank notices aren't CPV-coded and carry no sector field, so health
// relevance is decided by keyword-scanning the project name + bid description
// (+ the classifier landing on a real category).
function isHealthcare(notice: ProcNotice, category: ProcurementCategory): boolean {
  const text = `${notice.project_name ?? ""} ${notice.bid_description ?? ""}`.toLowerCase();
  if (/health|medical|hospital|clinic|pharma|vaccine|hiv|malaria|tuberculosis|nutrition|maternal|disease|surgical|diagnostic|laborator|menstrual|sanitary|hygiene|\bwash\b|sanitation/.test(text)) {
    return true;
  }
  return category !== "other";
}

// Publication dates come as "22-Jul-2026"; deadlines as ISO. Handle both.
function parseWbDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * World Bank Group procurement notices — tenders for World Bank-financed
 * development projects worldwide (health, infrastructure, etc.) via the
 * public search.worldbank.org API. No login, no key.
 */
export class WorldBankScraper extends ApiScraper {
  readonly source = "world_bank" as const;
  readonly baseUrl = "https://search.worldbank.org";

  private readonly rows = 200;
  private readonly maxPages = 20;

  private pageUrl(offset: number): string {
    // Return all default fields (no `fl` projection) sorted newest-first.
    return (
      `${this.baseUrl}/api/v2/procnotices?format=json&rows=${this.rows}&os=${offset}` +
      `&srt=noticedate&order=desc`
    );
  }

  protected async fetchTenders(): Promise<Partial<Tender>[]> {
    const out: Partial<Tender>[] = [];
    const seen = new Set<string>();
    let scanned = 0;

    // Walk offset pages (os += rows) newest-first until a short/empty page,
    // the reported total is exhausted, or the page cap is hit. The health
    // filter runs per notice, so we page through the raw feed to surface the
    // health-sector slice buried within it rather than just the newest 200.
    for (let page = 0; page < this.maxPages; page++) {
      const offset = page * this.rows;
      const res = await fetch(this.pageUrl(offset), {
        headers: { Accept: "application/json", "User-Agent": SCRAPER_USER_AGENT },
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        const snippet = (await res.text().catch(() => "")).slice(0, 300);
        // First page failing is a hard error; a later page failing keeps what
        // was already collected rather than throwing the whole run away.
        if (page === 0) {
          throw new Error(`World Bank API returned ${res.status}: ${snippet}`);
        }
        logger.warn("World Bank: non-OK on later page, stopping pagination", { page, status: res.status });
        break;
      }

      const data = (await res.json()) as ProcNoticesResponse;
      const notices = data.procnotices ?? [];
      if (notices.length === 0) break;
      scanned += notices.length;

      for (const n of notices) {
        if (!n.project_name && !n.bid_description) continue;
        if (!n.id || seen.has(n.id)) continue;
        const title = n.project_name ?? n.bid_description ?? "";
        const description = n.bid_description ?? "";
        const category = classifyUkTender(title, description);
        if (!isHealthcare(n, category)) continue;
        seen.add(n.id);
        out.push(this.mapNotice(n, title, description, category));
      }

      // Stop once we've walked the whole reported result set, or the API
      // returned a short final page.
      const total = data.total != null ? Number(data.total) : undefined;
      if (total !== undefined && !Number.isNaN(total) && offset + notices.length >= total) break;
      if (notices.length < this.rows) break;
    }

    logger.info("World Bank: healthcare tenders collected", { kept: out.length, noticesScanned: scanned });
    return out;
  }

  private mapNotice(
    notice: ProcNotice,
    title: string,
    description: string,
    category: ProcurementCategory,
  ): Partial<Tender> {
    return {
      externalId: notice.id!,
      source: "world_bank",
      title,
      description,
      buyerName: notice.project_name || "World Bank-Financed Project",
      buyerCountry: notice.project_ctry_name || "",
      buyerRegion: regionForCountry(notice.project_ctry_name),
      category,
      status: mapStatus(notice),
      publishedAt: parseWbDate(notice.noticedate) ?? new Date(),
      deadline: parseWbDate(notice.submission_date),
      originalCurrency: "USD",
      originalValue: null,
      valueUsd: null,
      complianceCriteria: ["World Bank Procurement Regulations"],
      cpvCodes: [],
      url: `https://projects.worldbank.org/en/projects-operations/procurement-detail/${notice.id}`,
      rawData: { projectId: notice.project_id, noticeType: notice.notice_type, reference: notice.bid_reference_no },
    };
  }
}
