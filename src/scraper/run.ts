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

/**
 * Run the scrapers once. Safe to call from the CLI or from a scheduler.
 * Returns a summary so callers (e.g. the monthly cron job) can log the outcome.
 */
export async function runScrapers(sourceFilter?: TenderSource) {
  const scrapers = sourceFilter
    ? ALL_SCRAPERS.filter((s) => s.source === sourceFilter)
    : ALL_SCRAPERS;

  if (scrapers.length === 0) {
    throw new Error(`No scrapers matched source: ${sourceFilter}`);
  }

  const headless = process.env.PLAYWRIGHT_HEADLESS !== "false";
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
  const browser = await chromium.launch({ headless, executablePath });

  logger.info("Scraper started", {
    sources: scrapers.map((s) => s.source),
    headless,
  });

  const results: ScrapeResult[] = [];

  try {
    for (const scraper of scrapers) {
      await scraper.init(browser);
      const result = await scraper.scrape();
      results.push(result);
      await logScrapeRun(result);
    }
  } finally {
    await browser.close();
  }

  const summary = {
    totalTenders: results.reduce((s, r) => s + r.tendersFound, 0),
    totalAwards: results.reduce((s, r) => s + r.awardsFound, 0),
    totalErrors: results.reduce((s, r) => s + r.errors.length, 0),
    totalDurationMs: results.reduce((s, r) => s + r.durationMs, 0),
  };

  logger.info("Scrape run complete", summary);
  return summary;
}

// CLI entry point — only runs when this file is executed directly (npm run scrape)
const isDirectRun = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isDirectRun) {
  const sourceArg = process.argv.find((a) => a.startsWith("--source="));
  const sourceFilter = sourceArg?.split("=")[1] as TenderSource | undefined;

  runScrapers(sourceFilter).catch((err) => {
    logger.error("Scraper crashed", { error: String(err) });
    process.exit(1);
  });
}
