import type { ScrapeResult, TenderSource, Tender, ContractAward } from "../types/index.js";
import { logger } from "../utils/logger.js";
import { persistTenders, persistAwards } from "./persist.js";

// A realistic browser User-Agent. Several government data endpoints (notably
// CanadaBuys' CSV) reject the default Node/undici agent with a 403, so every
// API-based scraper should send this. Kept in one place so it's easy to bump.
export const SCRAPER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// An award pulled out of the same fetch as its tender, keyed by the
// tender's externalId so it can be linked to the tender's real DB id
// (and category) only after that tender has actually been persisted.
export type PendingAward = Partial<ContractAward> & { tenderExternalId: string };

/**
 * Base class for sources with a public JSON/OCDS API (Contracts Finder, Find
 * a Tender) — no Playwright/browser needed, unlike BaseScraper. init() is a
 * no-op that exists only so run.ts can treat every scraper uniformly.
 */
export abstract class ApiScraper {
  abstract readonly source: TenderSource;
  abstract readonly baseUrl: string;

  // Populated by fetchTenders() implementations that also find award data
  // in the same payload (e.g. OCDS release.awards[]) — cleared at the start
  // of every scrape() so a subclass instance is safe to reuse across runs.
  protected pendingAwards: PendingAward[] = [];

  async init(): Promise<void> {}

  async scrape(): Promise<ScrapeResult> {
    const start = Date.now();
    this.pendingAwards = [];
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

      if (this.pendingAwards.length > 0) {
        const categoryByExternalId = new Map(tenders.map((t) => [t.externalId, t.category]));
        const titleByExternalId = new Map(tenders.map((t) => [t.externalId, t.title]));

        const awardsToPersist: Partial<ContractAward>[] = this.pendingAwards.map((a) => {
          const { tenderExternalId, ...award } = a;
          return {
            ...award,
            tenderId: persisted.idsByExternalId.get(tenderExternalId) ?? null,
            category: categoryByExternalId.get(tenderExternalId) ?? null,
            tenderTitle: titleByExternalId.get(tenderExternalId) ?? null,
          };
        });

        const awardsPersisted = await persistAwards(awardsToPersist);
        result.awardsFound = this.pendingAwards.length;
        if (awardsPersisted.failed > 0) {
          result.errors.push(`${awardsPersisted.failed} award(s) failed to persist`);
        }
        logger.info(`API scrape: awards processed for ${this.source}`, {
          awardsFound: this.pendingAwards.length,
          awardsPersisted: awardsPersisted.persisted,
        });
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
