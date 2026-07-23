import { describe, it, expect, vi } from "vitest";
import { TedEuropaScraper } from "../src/scraper/sources/ted.js";
import { SamGovScraper } from "../src/scraper/sources/sam.js";
import { GovconScraper } from "../src/scraper/sources/govcon.js";
import { WHOProcurementScraper } from "../src/scraper/sources/who.js";
import { NHSSupplyChainScraper } from "../src/scraper/sources/nhs-supply-chain.js";

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

describe("SamGovScraper (official API)", () => {
  it("has correct source identifier", () => {
    const scraper = new SamGovScraper();
    expect(scraper.source).toBe("sam_gov");
  });

  it("has correct base URL", () => {
    const scraper = new SamGovScraper();
    expect(scraper.baseUrl).toBe("https://sam.gov");
  });

  it("errors clearly when SAM_GOV_API_KEY is not set", async () => {
    const prev = process.env.SAM_GOV_API_KEY;
    delete process.env.SAM_GOV_API_KEY;
    const scraper = new SamGovScraper();
    const result = await scraper.scrape();
    expect(result.source).toBe("sam_gov");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("SAM_GOV_API_KEY");
    expect(result.tendersFound).toBe(0);
    if (prev !== undefined) process.env.SAM_GOV_API_KEY = prev;
  });
});

describe("GovconScraper (govconapi.com)", () => {
  it("persists under the sam_gov source", () => {
    const scraper = new GovconScraper();
    expect(scraper.source).toBe("sam_gov");
  });

  it("has correct base URL", () => {
    const scraper = new GovconScraper();
    expect(scraper.baseUrl).toBe("https://govconapi.com");
  });

  it("errors clearly when GOVCON_API_KEY is not set", async () => {
    const prev = process.env.GOVCON_API_KEY;
    delete process.env.GOVCON_API_KEY;
    const scraper = new GovconScraper();
    const result = await scraper.scrape();
    expect(result.source).toBe("sam_gov");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("GOVCON_API_KEY");
    expect(result.tendersFound).toBe(0);
    if (prev !== undefined) process.env.GOVCON_API_KEY = prev;
  });
});

describe("WHOProcurementScraper (UNGM)", () => {
  it("has the who_procurement source identifier", () => {
    expect(new WHOProcurementScraper().source).toBe("who_procurement");
  });

  it("has correct base URL", () => {
    expect(new WHOProcurementScraper().baseUrl).toBe("https://www.ungm.org");
  });
});

describe("NHSSupplyChainScraper (SCCL via FTS OCDS)", () => {
  it("has the nhs_supply_chain source identifier", () => {
    expect(new NHSSupplyChainScraper().source).toBe("nhs_supply_chain");
  });

  it("queries the Find a Tender host", () => {
    expect(new NHSSupplyChainScraper().baseUrl).toBe("https://www.find-tender.service.gov.uk");
  });
});
