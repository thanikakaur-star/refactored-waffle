import type { Page } from "playwright";
import { BaseScraper } from "../base.js";
import { classifyUkTender } from "./uk-category-map.js";
import { logger } from "../../utils/logger.js";
import type { Tender, ContractAward, ProcurementCategory } from "../../types/index.js";

// UNICEF Supply Division and UNFPA are the UN system's largest procurers of
// menstrual-health, hygiene and WASH supplies (sanitary products, dignity kits,
// hygiene kits, reproductive-health commodities). Both publish public tender /
// procurement pages as HTML with NO public JSON API — so this drives a real
// browser (Playwright) and scrapes the rendered notice links, keeping health /
// menstrual / WASH-relevant ones.
//
// NOTE: the listing URLs and selectors are UNVERIFIED against live markup (this
// sandbox can't reach unicef.org / unfpa.org). To make the first live run
// self-correcting, each agency tries several candidate listing URLs, and if the
// whole pass matches zero notices, extractTenders throws with a snippet of the
// rendered DOM — that surfaces in scrape_runs.errors so URLs/selectors can be
// fixed against real structure on the next pass, exactly like the UNGM source.

interface AgencyConfig {
  name: string;          // buyerName shown to users
  urls: string[];        // candidate listing pages, tried in order
  linkPattern: RegExp;   // hrefs that look like a notice/tender detail page
}

const AGENCIES: AgencyConfig[] = [
  {
    name: "UNICEF",
    urls: [
      "https://www.unicef.org/supply/tenders",
      "https://www.unicef.org/supply/whats-new",
      "https://supply.unicef.org/all-tenders.html",
    ],
    linkPattern: /tender|procure|rfp|rfq|\bitb\b|\beoi\b|solicit/i,
  },
  {
    name: "UNFPA",
    urls: [
      "https://www.unfpa.org/procurement-notices",
      "https://www.unfpa.org/procurement",
    ],
    linkPattern: /procure|tender|notice|rfp|rfq|\bitb\b|\beoi\b|solicit/i,
  },
];

interface AgencyRow {
  title: string;
  href: string;
  rowText: string;
}

export class UnAgenciesScraper extends BaseScraper {
  readonly source = "un_agencies" as const;
  readonly baseUrl = "https://www.unicef.org";

  async extractTenders(page: Page): Promise<Partial<Tender>[]> {
    const seen = new Set<string>();
    const out: Partial<Tender>[] = [];
    let anchorsSeen = 0;
    let lastDomSnippet = "";
    // Sample of links that looked plausible but were NOT matched — surfaces the
    // real link/title structure so the linkPattern/relevance filter can be tuned
    // without needing a failing run (the scraper can succeed at low yield).
    const unmatchedSample: Array<{ title: string; href: string }> = [];

    for (const agency of AGENCIES) {
      for (const url of agency.urls) {
        const navigated = await this.safeNavigate(page, url);
        if (!navigated) continue;
        // Content is often injected client-side; give it a moment.
        await page.waitForTimeout(3500);

        const rows: AgencyRow[] = await page
          .$$eval("a[href]", (anchors) =>
            anchors
              .map((a) => {
                const href = a.getAttribute("href") || "";
                const container =
                  a.closest("tr, li, .card, .teaser, .views-row, article, .field__item") || a.parentElement;
                const rowText = (container?.textContent || "").replace(/\s+/g, " ").trim();
                return {
                  href,
                  title: (a.textContent || "").replace(/\s+/g, " ").trim(),
                  rowText,
                };
              })
              .filter((r) => r.href && r.title.length > 12),
          )
          .catch(() => [] as Array<{ href: string; title: string; rowText: string }>);

        anchorsSeen += rows.length;

        for (const r of rows) {
          if (!agency.linkPattern.test(`${r.href} ${r.title}`)) {
            // Capture a few plausible-looking (dated / longish) non-matches to
            // reveal what real tender links look like on these pages.
            if (unmatchedSample.length < 20 && r.title.length > 25) {
              unmatchedSample.push({ title: r.title.slice(0, 90), href: r.href.slice(0, 120) });
            }
            continue;
          }
          const id = this.deriveId(agency.name, r.href);
          if (!id || seen.has(id)) continue;

          const text = `${r.title} ${r.rowText}`;
          const category = classifyUkTender(r.title, r.rowText);
          // Keep notices classified into a real category, or clearly health /
          // menstrual / WASH by text — drop generic nav/footer links.
          const relevant =
            category !== "other" ||
            /health|medical|pharma|vaccine|nutrition|hygiene|menstru|sanitary|dignity kit|\bwash\b|sanitation|reproductive|supply/i.test(text);
          if (!relevant) continue;

          seen.add(id);
          out.push(this.mapRow(agency.name, id, r, category));
        }

        // If this agency yielded rows, no need to try its fallback URLs.
        if (out.some((t) => t.buyerName === agency.name)) break;
        lastDomSnippet = await page
          .$eval("body", (el) => (el.innerHTML || "").replace(/\s+/g, " ").slice(0, 700))
          .catch(() => "");
      }
    }

    if (out.length === 0) {
      throw new Error(
        `UN agencies: no notices matched across UNICEF/UNFPA URLs (anchors seen: ${anchorsSeen}). ` +
          `Last DOM snippet: ${lastDomSnippet || "(none)"}`,
      );
    }

    logger.info("UN agencies: notices scraped", {
      anchorsSeen,
      kept: out.length,
      // If yield is low, this shows what real tender links look like so the
      // filter can be tuned. Trim once the selectors are dialled in.
      unmatchedSample: out.length < 10 ? unmatchedSample : undefined,
    });
    return out;
  }

  async extractAwards(_page: Page): Promise<Partial<ContractAward>[]> {
    return [];
  }

  private deriveId(agency: string, href: string): string {
    // Stable id from the href path (or its last meaningful segment).
    const cleaned = href.split(/[?#]/)[0].replace(/\/+$/, "");
    const seg = cleaned.split("/").filter(Boolean).pop() || cleaned;
    return seg ? `${agency.toLowerCase()}:${seg}`.slice(0, 200) : "";
  }

  private mapRow(agency: string, id: string, row: AgencyRow, category: ProcurementCategory): Partial<Tender> {
    const url = row.href.startsWith("http")
      ? row.href
      : `${agency === "UNFPA" ? "https://www.unfpa.org" : this.baseUrl}${row.href}`;
    const dateMatch = row.rowText.match(/\d{1,2}[-/\s][A-Za-z]{3,}[-/\s]\d{4}|\d{4}-\d{2}-\d{2}/);
    const deadline = dateMatch ? new Date(dateMatch[0]) : null;

    return {
      externalId: id,
      source: "un_agencies",
      title: row.title,
      description: row.rowText.slice(0, 500),
      buyerName: agency,
      buyerCountry: agency === "UNFPA" ? "US" : "DK", // UNFPA HQ NY; UNICEF Supply Division Copenhagen
      buyerRegion: "Global",
      category,
      status: "open",
      publishedAt: new Date(),
      deadline: deadline && !Number.isNaN(deadline.getTime()) ? deadline : null,
      originalCurrency: "USD",
      originalValue: null,
      valueUsd: null,
      complianceCriteria: ["UN procurement standards", "UNGM registration"],
      cpvCodes: [],
      url,
      rawData: { agency },
    };
  }
}
