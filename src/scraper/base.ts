import type { Browser, Page } from "playwright";
import type { ScrapeResult, TenderSource, Tender, ContractAward } from "../types/index.js";
import { logger } from "../utils/logger.js";

export abstract class BaseScraper {
  abstract readonly source: TenderSource;
  abstract readonly baseUrl: string;

  protected browser: Browser | null = null;

  async init(browser: Browser): Promise<void> {
    this.browser = browser;
  }

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
      if (!this.browser) throw new Error("Browser not initialized");

      const page = await this.browser.newPage();
      await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });

      logger.info(`Starting scrape: ${this.source}`, { url: this.baseUrl });

      const tenders = await this.extractTenders(page);
      result.tendersFound = tenders.length;

      const awards = await this.extractAwards(page);
      result.awardsFound = awards.length;

      await page.close();
      logger.info(`Scrape complete: ${this.source}`, {
        tenders: tenders.length,
        awards: awards.length,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push(message);
      logger.error(`Scrape failed: ${this.source}`, { error: message });
    }

    result.durationMs = Date.now() - start;
    return result;
  }

  abstract extractTenders(page: Page): Promise<Partial<Tender>[]>;

  abstract extractAwards(page: Page): Promise<Partial<ContractAward>[]>;

  protected async safeNavigate(page: Page, url: string, timeout = 30000): Promise<boolean> {
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout });
      return true;
    } catch {
      logger.warn(`Navigation timeout: ${url}`);
      return false;
    }
  }

  protected async safeText(page: Page, selector: string): Promise<string> {
    try {
      const el = await page.$(selector);
      return el ? ((await el.textContent()) ?? "").trim() : "";
    } catch {
      return "";
    }
  }

  protected async safeTextAll(page: Page, selector: string): Promise<string[]> {
    try {
      const elements = await page.$$(selector);
      const texts: string[] = [];
      for (const el of elements) {
        const text = ((await el.textContent()) ?? "").trim();
        if (text) texts.push(text);
      }
      return texts;
    } catch {
      return [];
    }
  }
}
