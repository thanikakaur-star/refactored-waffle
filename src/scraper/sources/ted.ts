import type { Page } from "playwright";
import { BaseScraper } from "../base.js";
import { convertToUsd, parseCurrencyValue } from "../../utils/currency.js";
import { logger } from "../../utils/logger.js";
import type { Tender, ContractAward, ProcurementCategory } from "../../types/index.js";

const CPV_CATEGORY_MAP: Record<string, ProcurementCategory> = {
  "33100000": "medical_devices",
  "33110000": "medical_devices",
  "33120000": "diagnostics",
  "33130000": "surgical_instruments",
  "33140000": "personal_protective_equipment",
  "33150000": "medical_devices",
  "33160000": "surgical_instruments",
  "33170000": "medical_devices",
  "33190000": "medical_devices",
  "33600000": "pharmaceuticals",
  "33690000": "pharmaceuticals",
  "38000000": "laboratory_equipment",
  "48000000": "health_it",
  "72000000": "health_it",
  "85140000": "telemedicine",
  "45000000": "hospital_infrastructure",
};

export class TedEuropaScraper extends BaseScraper {
  readonly source = "ted_europa" as const;
  readonly baseUrl = "https://ted.europa.eu";

  private readonly searchUrl = `${this.baseUrl}/en/search/result?q=healthcare+medical+device&sortField=PD&sortOrder=desc`;

  async extractTenders(page: Page): Promise<Partial<Tender>[]> {
    const tenders: Partial<Tender>[] = [];

    const navigated = await this.safeNavigate(page, this.searchUrl);
    if (!navigated) return tenders;

    await page.waitForTimeout(2000);

    const noticeLinks = await page.$$eval(
      "a[href*='/notice/']",
      (links) => links.map((a) => a.getAttribute("href")).filter(Boolean).slice(0, 20)
    );

    logger.info("TED: Found notice links", { count: noticeLinks.length });

    for (const link of noticeLinks) {
      try {
        const fullUrl = link!.startsWith("http") ? link! : `${this.baseUrl}${link}`;
        const ok = await this.safeNavigate(page, fullUrl);
        if (!ok) continue;

        const tender = await this.parseTenderPage(page, fullUrl);
        if (tender) tenders.push(tender);

        await page.waitForTimeout(1000 + Math.random() * 2000);
      } catch (err) {
        logger.warn("TED: Failed to parse notice", { link, error: String(err) });
      }
    }

    return tenders;
  }

  private async parseTenderPage(page: Page, url: string): Promise<Partial<Tender> | null> {
    const title = await this.safeText(page, "h1, .notice-title, [data-field='title']");
    if (!title) return null;

    const externalId = url.match(/notice\/(\d+[-/]\d+)/)?.[1] ?? url.split("/").pop() ?? "";
    const description = await this.safeText(page, ".notice-description, [data-field='description'], .short-description");
    const buyerName = await this.safeText(page, ".buyer-name, [data-field='buyer'], .contracting-authority");
    const buyerCountry = await this.safeText(page, ".buyer-country, [data-field='country']");

    const valueText = await this.safeText(page, ".estimated-value, [data-field='value'], .total-value");
    const parsed = valueText ? parseCurrencyValue(valueText) : null;

    const cpvTexts = await this.safeTextAll(page, ".cpv-code, [data-field='cpv']");
    const cpvCodes = cpvTexts.map((t) => t.replace(/[^\d-]/g, "")).filter((c) => c.length >= 8);

    const deadlineText = await this.safeText(page, ".deadline, [data-field='deadline'], .time-limit");
    const publishedText = await this.safeText(page, ".publication-date, [data-field='published']");

    const complianceTexts = await this.safeTextAll(page, ".selection-criteria li, .compliance-item");

    const category = this.mapCpvToCategory(cpvCodes);

    return {
      externalId,
      source: "ted_europa",
      title,
      description,
      buyerName: buyerName || "Unknown Buyer",
      buyerCountry: this.normalizeCountry(buyerCountry),
      buyerRegion: "Europe",
      category,
      status: "open",
      publishedAt: this.parseDate(publishedText) ?? new Date(),
      deadline: this.parseDate(deadlineText),
      originalCurrency: parsed?.currency ?? "EUR",
      originalValue: parsed?.amount ?? null,
      valueUsd: parsed ? convertToUsd(parsed.amount, parsed.currency) : null,
      complianceCriteria: complianceTexts.length > 0 ? complianceTexts : ["EU public procurement directives"],
      cpvCodes,
      url,
      rawData: { valueText, deadlineText, publishedText },
    };
  }

  async extractAwards(page: Page): Promise<Partial<ContractAward>[]> {
    return [];
  }

  private mapCpvToCategory(cpvCodes: string[]): ProcurementCategory {
    for (const code of cpvCodes) {
      const prefix = code.slice(0, 8);
      if (CPV_CATEGORY_MAP[prefix]) return CPV_CATEGORY_MAP[prefix];
    }
    return "other";
  }

  private normalizeCountry(raw: string): string {
    const countryMap: Record<string, string> = {
      germany: "DE", france: "FR", italy: "IT", spain: "ES",
      netherlands: "NL", belgium: "BE", austria: "AT", sweden: "SE",
      denmark: "DK", finland: "FI", ireland: "IE", portugal: "PT",
      greece: "GR", poland: "PL", "czech republic": "CZ", romania: "RO",
      hungary: "HU", croatia: "HR", bulgaria: "BG", slovakia: "SK",
      slovenia: "SI", lithuania: "LT", latvia: "LV", estonia: "EE",
      luxembourg: "LU", malta: "MT", cyprus: "CY",
    };
    const lower = raw.toLowerCase().trim();
    return countryMap[lower] ?? raw.slice(0, 2).toUpperCase();
  }

  private parseDate(raw: string): Date | null {
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }
}
