import type { Page } from "playwright";
import { BaseScraper } from "../base.js";
import { classifyUkTender } from "./uk-category-map.js";
import { logger } from "../../utils/logger.js";
import type { Tender, ContractAward, ProcurementCategory } from "../../types/index.js";

// WHO (and the wider UN system) publishes procurement notices on UNGM
// (ungm.org). UNGM's public notice search is a session/CSRF-protected ASP.NET
// app with NO public JSON API — an unauthenticated fetch just gets an HTML
// error page. So this source drives a real browser (Playwright) against the
// public notices page and scrapes the rendered results, keeping WHO / health
// notices.
//
// NOTE: the DOM selectors below are unverified against live UNGM markup (this
// sandbox can't reach ungm.org). To make the first live run self-correcting,
// if no notice rows match, extractTenders throws with a snippet of the actual
// rendered DOM — that surfaces in scrape_runs.errors so the selectors can be
// fixed against real structure on the next pass.

interface UngmRow {
  id: string;
  title: string;
  href: string;
  rowText: string;
}

// UNGM row text is prefixed with a save/subscribe call-to-action; the real
// notice title/description follows it. Strip everything up to and including
// "... save procurement opportunities." to recover the content.
function cleanUngmText(rowText: string): string {
  return rowText.replace(/^.*?save procurement opportunities\.\s*/i, "").trim();
}

export class WHOProcurementScraper extends BaseScraper {
  readonly source = "who_procurement" as const;
  readonly baseUrl = "https://www.ungm.org";

  private readonly searchUrl = `${this.baseUrl}/Public/Notice`;

  async extractTenders(page: Page): Promise<Partial<Tender>[]> {
    const navigated = await this.safeNavigate(page, this.searchUrl);
    if (!navigated) return [];

    // UNGM renders its results grid client-side after an XHR — give it time.
    await page.waitForTimeout(5000);

    // Pull every anchor that points at a notice detail page, plus the text of
    // its surrounding row, in one DOM pass. Using $$eval (not evaluate) so
    // Playwright types the callback args and we avoid a DOM-lib dependency.
    const rows: UngmRow[] = await page
      .$$eval("a[href*='/Public/Notice/']", (anchors) =>
        anchors
          .map((a) => {
            const href = a.getAttribute("href") || "";
            const idMatch = href.match(/\/Public\/Notice\/(\d+)/);
            const container =
              a.closest("tr, .tableRow, .row, li, .searchResult, .ungm-list-item") || a.parentElement;
            const rowText = (container?.textContent || "").replace(/\s+/g, " ").trim();
            return {
              id: idMatch ? idMatch[1] : "",
              title: (a.textContent || "").replace(/\s+/g, " ").trim(),
              href,
              rowText,
            };
          })
          .filter((r) => r.id),
      )
      .catch(() => [] as UngmRow[]);

    if (rows.length === 0) {
      // Self-diagnostic: capture the rendered structure so the selectors can be
      // corrected from a real sample (surfaces in scrape_runs.errors).
      const snippet = await page
        .$eval("body", (el) => (el.innerHTML || "").replace(/\s+/g, " ").slice(0, 900))
        .catch(() => "(could not read body)");
      throw new Error(`UNGM: no notice rows matched selectors. Rendered DOM snippet: ${snippet}`);
    }

    // Diagnostic: UNGM returns notice anchors but we keep 0 — is that because
    // the default page shows non-health notices (so we must search), or because
    // rowText extraction is failing so nothing classifies? Log a sample of what
    // we actually got (title + rowText) to tell the two apart on the next run.
    logger.info("UNGM: anchor sample", {
      total: rows.length,
      sample: rows.slice(0, 15).map((r) => ({
        title: r.title.slice(0, 80),
        rowTextLen: r.rowText.length,
        rowText: r.rowText.slice(0, 120),
      })),
    });

    const seen = new Set<string>();
    const out: Partial<Tender>[] = [];
    for (const row of rows) {
      if (!row.id || seen.has(row.id)) continue;

      // The anchor text is a generic "Open in a new window" icon label — the
      // real notice title lives in rowText, behind UNGM's boilerplate ("Unsave
      // this procurement opportunity. Subscribe to UNGM Pro … save procurement
      // opportunities."). Strip that prefix, then take the lead of what remains
      // as the title and classify on it.
      const cleanText = cleanUngmText(row.rowText);
      if (!cleanText) continue;
      const title = cleanText.slice(0, 160);

      // Keep WHO notices, or clearly health-related notices from any UN agency
      // (UNGM hosts many health buyers — WHO, UNICEF, UNFPA, etc.).
      const isWho = /who\b|world health/i.test(cleanText);
      const category = classifyUkTender(title, cleanText);
      const healthText =
        /health|medical|pharma|vaccine|hospital|clinic|diagnostic|surgical|laborator|menstru|sanitary|hygiene|\bwash\b|sanitation|dignity kit|reproductive|nutrition/i.test(
          cleanText,
        );
      if (!isWho && !healthText && category === "other") continue;

      seen.add(row.id);
      out.push(this.mapRow(row, category, title, cleanText));
    }

    logger.info("WHO/UNGM: notices scraped", { anchors: rows.length, kept: out.length });
    return out;
  }

  async extractAwards(_page: Page): Promise<Partial<ContractAward>[]> {
    return [];
  }

  private mapRow(row: UngmRow, category: ProcurementCategory, title: string, cleanText: string): Partial<Tender> {
    const url = row.href.startsWith("http") ? row.href : `${this.baseUrl}${row.href}`;
    // Best-effort deadline: look for a dd-Mon-yyyy or ISO-ish date in the row.
    const dateMatch = cleanText.match(/\d{1,2}[-/\s][A-Za-z]{3,}[-/\s]\d{4}|\d{4}-\d{2}-\d{2}/);
    const deadline = dateMatch ? new Date(dateMatch[0]) : null;

    return {
      externalId: row.id,
      source: "who_procurement",
      title,
      description: cleanText.slice(0, 500),
      buyerName: /who\b|world health/i.test(cleanText) ? "World Health Organization" : "UN Agency (UNGM)",
      buyerCountry: "CH",
      buyerRegion: "Global",
      category,
      status: "open",
      publishedAt: new Date(),
      deadline: deadline && !Number.isNaN(deadline.getTime()) ? deadline : null,
      originalCurrency: "USD",
      originalValue: null,
      valueUsd: null,
      complianceCriteria: ["WHO procurement standards", "UNGM registration"],
      cpvCodes: [],
      url,
      rawData: {},
    };
  }
}
