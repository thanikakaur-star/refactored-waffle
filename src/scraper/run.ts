import { chromium } from "playwright";
import { TedEuropaScraper } from "./sources/ted.js";
import { SamGovScraper } from "./sources/sam.js";
import { getSupabaseClient } from "../db/client.js";
import { logger } from "../utils/logger.js";
import { v4 as uuidv4 } from "uuid";
import type { ScrapeResult, TenderSource } from "../types/index.js";
import { BaseScraper } from "./base.js";

const ALL_SCRAPERS: BaseScraper[] = [new TedEuropaScraper(), new SamGovScraper()];

async function logScrapeRun(result: ScrapeResult) {
  try {
    const client = getSupabaseClient();
    await client.from("scrape_runs").insert({
      id: uuidv4(),
      source: result.source,
      tenders_found: result.tendersFound,
      tenders_new: result.tendersNew,
      tenders_updated: result.tendersUpdated,
      awards_found: result.awardsFound,
      errors: result.errors,
      duration_ms: result.durationMs,
      status: result.errors.length > 0 ? "partial" : "complete",
      completed_at: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn("Failed to log scrape run", { error: String(err) });
  }
}

async function run() {
  const sourceArg = process.argv.find((a) => a.startsWith("--source="));
  const sourceFilter = sourceArg?.split("=")[1] as TenderSource | undefined;

  const scrapers = sourceFilter
    ? ALL_SCRAPERS.filter((s) => s.source === sourceFilter)
    : ALL_SCRAPERS;

  if (scrapers.length === 0) {
    logger.error("No scrapers matched", { source: sourceFilter });
    process.exit(1);
  }

  const headless = process.env.PLAYWRIGHT_HEADLESS !== "false";
  const browser = await chromium.launch({ headless });

  logger.info("Scraper started", {
    sources: scrapers.map((s) => s.source),
    headless,
  });

  const results: ScrapeResult[] = [];

  for (const scraper of scrapers) {
    await scraper.init(browser);
    const result = await scraper.scrape();
    results.push(result);
    await logScrapeRun(result);
  }

  await browser.close();

  const summary = {
    totalTenders: results.reduce((s, r) => s + r.tendersFound, 0),
    totalAwards: results.reduce((s, r) => s + r.awardsFound, 0),
    totalErrors: results.reduce((s, r) => s + r.errors.length, 0),
    totalDurationMs: results.reduce((s, r) => s + r.durationMs, 0),
  };

  logger.info("Scrape run complete", summary);
}

run().catch((err) => {
  logger.error("Scraper crashed", { error: String(err) });
  process.exit(1);
});
