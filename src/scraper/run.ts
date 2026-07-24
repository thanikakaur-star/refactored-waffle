import { chromium } from "playwright";
import { TedEuropaScraper } from "./sources/ted.js";
// SamGovScraper (official api.sam.gov) is intentionally NOT in ALL_SCRAPERS —
// api.sam.gov returns 404 at its Istio/Envoy edge for every path (opportunities
// AND entity APIs) from this deployment's egress, i.e. it appears to block
// cloud/datacenter IPs. GovconScraper covers the same US federal opportunity
// data (via govconapi.com, which does serve us). The class is kept so it can be
// re-enabled if ever run from an allowlisted network. See git history + the
// scrape_runs diagnostics for the 404 investigation.
// import { SamGovScraper } from "./sources/sam.js";
import { GovconScraper } from "./sources/govcon.js";
import { ContractsFinderScraper } from "./sources/contracts-finder.js";
import { FindATenderScraper } from "./sources/find-a-tender.js";
import { WorldBankScraper } from "./sources/world-bank.js";
import { CanadaBuysScraper } from "./sources/canada-buys.js";
import { WHOProcurementScraper } from "./sources/who.js";
import { NHSSupplyChainScraper } from "./sources/nhs-supply-chain.js";
import { getSupabaseClient } from "../db/client.js";
import { logger } from "../utils/logger.js";
import { checkAlertsAndNotify } from "../alerts/notifier.js";
import { v4 as uuidv4 } from "uuid";
import type { ScrapeResult } from "../types/index.js";
import { BaseScraper } from "./base.js";
import { ApiScraper } from "./api-base.js";

type AnyScraper = BaseScraper | ApiScraper;

const ALL_SCRAPERS: AnyScraper[] = [
  new TedEuropaScraper(),
  // new SamGovScraper(),  // disabled — api.sam.gov 404s from this egress (see import note); GovCon covers federal
  new GovconScraper(),
  new ContractsFinderScraper(),
  new FindATenderScraper(),
  new WorldBankScraper(),
  new CanadaBuysScraper(),
  new WHOProcurementScraper(),
  new NHSSupplyChainScraper(),
];

// GovconScraper persists under source="sam_gov" (the US federal tender_source).
// With the official SamGovScraper disabled (api.sam.gov 404s from this egress),
// GovCon is the sole sam_gov source, so the sam/sam_gov/govcon filters all
// target it.
function matchesFilter(scraper: AnyScraper, filter: string): boolean {
  if (filter === "govcon" || filter === "sam" || filter === "sam_gov") return scraper instanceof GovconScraper;
  if (filter === "who") return scraper.source === "who_procurement";
  if (filter === "nhs") return scraper.source === "nhs_supply_chain";
  if (filter === "ted") return scraper.source === "ted_europa";
  return scraper.source === filter;
}

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
export async function runScrapers(sourceFilter?: string) {
  const scrapers = sourceFilter
    ? ALL_SCRAPERS.filter((s) => matchesFilter(s, sourceFilter))
    : ALL_SCRAPERS;

  if (scrapers.length === 0) {
    throw new Error(`No scrapers matched source: ${sourceFilter}`);
  }

  const needsBrowser = scrapers.some((s) => s instanceof BaseScraper);
  const headless = process.env.PLAYWRIGHT_HEADLESS !== "false";
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

  // Try to launch a browser only if a browser-based scraper is in the set.
  // If it fails (e.g. no Chromium binary installed in production), we log it
  // and carry on — the API-based scrapers (SAM.gov, Find a Tender, Contracts
  // Finder) don't need a browser and must still run. One broken source must
  // never sink the whole pipeline.
  let browser = null;
  if (needsBrowser) {
    try {
      browser = await chromium.launch({ headless, executablePath });
    } catch (err) {
      logger.error("Browser launch failed — running API-based scrapers only", { error: String(err) });
    }
  }

  logger.info("Scraper started", {
    sources: scrapers.map((s) => s.source),
    headless,
    browserLaunched: !!browser,
  });

  const results: ScrapeResult[] = [];

  try {
    for (const scraper of scrapers) {
      try {
        if (scraper instanceof BaseScraper) {
          if (!browser) {
            // Browser-based source but no browser available — record and skip,
            // don't abort the whole run.
            const skipped: ScrapeResult = {
              source: scraper.source,
              tendersFound: 0, tendersNew: 0, tendersUpdated: 0, awardsFound: 0,
              errors: ["Skipped — no browser available"],
              durationMs: 0,
            };
            results.push(skipped);
            await logScrapeRun(skipped);
            continue;
          }
          await scraper.init(browser);
        } else {
          await scraper.init();
        }
        const result = await scraper.scrape();
        results.push(result);
        await logScrapeRun(result);
      } catch (err) {
        logger.error("Scraper threw — continuing with the rest", { source: scraper.source, error: String(err) });
      }
    }
  } finally {
    if (browser) await browser.close();
  }

  const summary = {
    totalTenders: results.reduce((s, r) => s + r.tendersFound, 0),
    totalAwards: results.reduce((s, r) => s + r.awardsFound, 0),
    totalErrors: results.reduce((s, r) => s + r.errors.length, 0),
    totalDurationMs: results.reduce((s, r) => s + r.durationMs, 0),
  };

  logger.info("Scrape run complete", summary);

  try {
    await checkAlertsAndNotify();
  } catch (err) {
    logger.warn("Alert check failed after scrape run", { error: String(err) });
  }

  return summary;
}

// CLI entry point — only runs when this file is executed directly (npm run scrape)
const isDirectRun = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isDirectRun) {
  const sourceArg = process.argv.find((a) => a.startsWith("--source="));
  const sourceFilter = sourceArg?.split("=")[1];

  runScrapers(sourceFilter).catch((err) => {
    logger.error("Scraper crashed", { error: String(err) });
    process.exit(1);
  });
}
