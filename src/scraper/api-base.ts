import type { ScrapeResult, TenderSource, Tender } from "../types/index.js";
import { logger } from "../utils/logger.js";
import { persistTenders } from "./persist.js";

/**
 * Base class for sources with a public JSON/OCDS API (Contracts Finder, Find
 * a Tender) — no Playwright/browser needed, unlike BaseScraper. init() is a
 * no-op that exists only so run.ts can treat every scraper uniformly.
 */
export abstract class ApiScraper {
  abstract readonly source: TenderSource;
  abstract readonly baseUrl: string;

  async init(): Promise<void> {}

  async scrape(): Promise<ScrapeResult> {
    const start = Date.now();
    const result: ScrapeResult = {
      source: this.source,
      tendersFound: 0,
      tendersNew: 0,
      tendersUpdated: 0,
      awardsFound: 0,
      errors: [],
      durationMs: 0,
    };

    try {
      logger.info(`Starting API scrape: ${this.source}`, { url: this.baseUrl });

      const tenders = await this.fetchTenders();
      result.tendersFound = tenders.length;

      const persisted = await persistTenders(tenders);
      result.tendersNew = persisted.persisted;
      if (persisted.failed > 0) {
        result.errors.push(`${persisted.failed} tender(s) failed to persist`);
      }

      logger.info(`API scrape complete: ${this.source}`, {
        tendersFound: tenders.length,
        tendersPersisted: persisted.persisted,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push(message);
      logger.error(`API scrape failed: ${this.source}`, { error: message });
    }

    result.durationMs = Date.now() - start;
    return result;
  }

  protected abstract fetchTenders(): Promise<Partial<Tender>[]>;
}
