import { ApiScraper } from "../api-base.js";
import { classifyUkTender } from "./uk-category-map.js";
import { logger } from "../../utils/logger.js";
import type { Tender, ProcurementCategory } from "../../types/index.js";

// World Bank procurement-notices API response shape — only fields we read.
// Documented at https://search.worldbank.org/api/v2/procnotices (JSON/XML,
// no key required). Field names confirmed from World Bank data-catalog docs;
// NOTE: not yet verified against a live request (this sandbox blocks the
// domain). Run once on the server and check scrape_runs before relying on
// it — failures surface there rather than silently returning nothing.
interface ProcNotice {
  id?: string;
  notice_type?: string;
  project_id?: string;
  project_name?: string;
  project_ctry_name?: string;
  region?: string;
  bid_description?: string;
  procurement_category?: string;
  procurement_method?: string;
  submission_deadline_date?: string;
  publication_date?: string;
  sector?: string;
}

interface ProcNoticesResponse {
  total?: number | string;
  procnotices?: {
    procnotice?: ProcNotice[];
  };
}

// World Bank notices don't carry an explicit status field — infer it from
// the submission deadline instead, since that's the only reliable signal.
function inferStatus(deadline: string | undefined): "open" | "closed" {
  if (!deadline) return "open";
  return new Date(deadline).getTime() > Date.now() ? "open" : "closed";
}

// World Bank notices aren't CPV-coded — classify off title/description
// keywords plus the bank's own "sector"/"procurement_category" strings,
// which frequently say "Health" outright for health-sector projects.
function isHealthcare(notice: ProcNotice, category: ProcurementCategory): boolean {
  const tag = `${notice.sector ?? ""} ${notice.procurement_category ?? ""}`.toLowerCase();
  if (/health|medical|pharma|hiv|malaria|nutrition/.test(tag)) return true;
  return category !== "other";
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
  private readonly maxPages = 15;
  private readonly fields = [
    "id", "notice_type", "project_id", "project_name", "project_ctry_name",
    "region", "bid_description", "procurement_category", "procurement_method",
    "submission_deadline_date", "publication_date", "sector",
  ].join(",");

  private pageUrl(offset: number): string {
    return (
      `${this.baseUrl}/api/v2/procnotices?format=json&rows=${this.rows}&os=${offset}` +
      `&srt=publication_date&order=desc&fl=${encodeURIComponent(this.fields)}`
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
        headers: { Accept: "application/json" },
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
      const notices = data.procnotices?.procnotice ?? [];
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
      buyerRegion: notice.region || "Global",
      category,
      status: inferStatus(notice.submission_deadline_date),
      publishedAt: notice.publication_date ? new Date(notice.publication_date) : new Date(),
      deadline: notice.submission_deadline_date ? new Date(notice.submission_deadline_date) : null,
      originalCurrency: "USD",
      originalValue: null,
      valueUsd: null,
      complianceCriteria: ["World Bank Procurement Regulations"],
      cpvCodes: [],
      url: `https://projects.worldbank.org/en/projects-operations/procurement-detail/${notice.id}`,
      rawData: { projectId: notice.project_id, noticeType: notice.notice_type },
    };
  }
}
