import { describe, it, expect, vi } from "vitest";
import { TedEuropaScraper } from "../src/scraper/sources/ted.js";
import { SamGovScraper } from "../src/scraper/sources/sam.js";

describe("TedEuropaScraper", () => {
  it("has correct source identifier", () => {
    const scraper = new TedEuropaScraper();
    expect(scraper.source).toBe("ted_europa");
  });

  it("has correct base URL", () => {
    const scraper = new TedEuropaScraper();
    expect(scraper.baseUrl).toBe("https://ted.europa.eu");
  });

  it("returns empty results when browser not initialized", async () => {
    const scraper = new TedEuropaScraper();
    const result = await scraper.scrape();
    expect(result.source).toBe("ted_europa");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.tendersFound).toBe(0);
  });
});

describe("SamGovScraper", () => {
  it("has correct source identifier", () => {
    const scraper = new SamGovScraper();
    expect(scraper.source).toBe("sam_gov");
  });

  it("has correct base URL", () => {
    const scraper = new SamGovScraper();
    expect(scraper.baseUrl).toBe("https://sam.gov");
  });

  it("returns empty results when browser not initialized", async () => {
    const scraper = new SamGovScraper();
    const result = await scraper.scrape();
    expect(result.source).toBe("sam_gov");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.tendersFound).toBe(0);
  });
});
