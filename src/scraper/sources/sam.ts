import type { Page } from "playwright";
import { BaseScraper } from "../base.js";
import { convertToUsd, parseCurrencyValue } from "../../utils/currency.js";
import { logger } from "../../utils/logger.js";
import type { Tender, ContractAward, ProcurementCategory } from "../../types/index.js";

const NAICS_CATEGORY_MAP: Record<string, ProcurementCategory> = {
  "339112": "medical_devices",
  "339113": "surgical_instruments",
  "339114": "diagnostics",
  "325411": "pharmaceuticals",
  "325412": "pharmaceuticals",
  "325413": "pharmaceuticals",
  "325414": "pharmaceuticals",
  "334510": "health_it",
  "334516": "diagnostics",
  "334517": "medical_devices",
  "621999": "telemedicine",
  "236220": "hospital_infrastructure",
  "339920": "personal_protective_equipment",
};

export class SamGovScraper extends BaseScraper {
  readonly source = "sam_gov" as const;
  readonly baseUrl = "https://sam.gov";

  private readonly searchUrl = `${this.baseUrl}/search/?index=opp&sort=-modifiedDate&keywords=healthcare+medical+device&is_active=true`;

  async extractTenders(page: Page): Promise<Partial<Tender>[]> {
    const tenders: Partial<Tender>[] = [];

    const navigated = await this.safeNavigate(page, this.searchUrl, 45000);
    if (!navigated) return tenders;

    await page.waitForTimeout(3000);

    const oppLinks = await page.$$eval(
      "a[href*='/opp/']",
      (links) => links.map((a) => ({ href: a.getAttribute("href"), text: a.textContent?.trim() })).filter((l) => l.href).slice(0, 20)
    );

    logger.info("SAM.gov: Found opportunity links", { count: oppLinks.length });

    for (const link of oppLinks) {
      try {
        const fullUrl = link.href!.startsWith("http") ? link.href! : `${this.baseUrl}${link.href}`;
        const ok = await this.safeNavigate(page, fullUrl);
        if (!ok) continue;

        const tender = await this.parseOpportunityPage(page, fullUrl);
        if (tender) tenders.push(tender);

        await page.waitForTimeout(1500 + Math.random() * 2000);
      } catch (err) {
        logger.warn("SAM.gov: Failed to parse opportunity", { href: link.href, error: String(err) });
      }
    }

    return tenders;
  }

  private async parseOpportunityPage(page: Page, url: string): Promise<Partial<Tender> | null> {
    const title = await this.safeText(page, "h1, .opportunity-title, [data-testid='title']");
    if (!title) return null;

    const externalId = url.match(/opp\/([A-Za-z0-9-]+)/)?.[1] ?? "";
    const description = await this.safeText(page, ".description, [data-testid='description'], .opportunity-description");
    const buyerName = await this.safeText(page, ".agency-name, [data-testid='agency'], .department");
    const naicsText = await this.safeText(page, ".naics-code, [data-testid='naics']");

    const valueText = await this.safeText(page, ".award-amount, .estimated-value, [data-testid='value']");
    const parsed = valueText ? parseCurrencyValue(valueText) : null;

    const deadlineText = await this.safeText(page, ".response-date, [data-testid='deadline']");
    const publishedText = await this.safeText(page, ".published-date, [data-testid='published']");
    const typeText = await this.safeText(page, ".opportunity-type, [data-testid='type']");

    const complianceTexts = await this.safeTextAll(page, ".eligibility-item, .requirement-item");

    const category = this.mapNaicsToCategory(naicsText);

    return {
      externalId,
      source: "sam_gov",
      title,
      description,
      buyerName: buyerName || "U.S. Federal Agency",
      buyerCountry: "US",
      buyerRegion: "North America",
      category,
      status: this.mapStatusFromType(typeText),
      publishedAt: this.parseDate(publishedText) ?? new Date(),
      deadline: this.parseDate(deadlineText),
      originalCurrency: "USD",
      originalValue: parsed?.amount ?? null,
      valueUsd: parsed?.amount ?? null,
      complianceCriteria: complianceTexts.length > 0 ? complianceTexts : ["FAR compliance", "SAM.gov registration"],
      cpvCodes: naicsText ? [naicsText.replace(/\D/g, "")] : [],
      url,
      rawData: { valueText, typeText, naicsText },
    };
  }

  async extractAwards(page: Page): Promise<Partial<ContractAward>[]> {
    return [];
  }

  private mapNaicsToCategory(naicsText: string): ProcurementCategory {
    const code = naicsText.replace(/\D/g, "").slice(0, 6);
    return NAICS_CATEGORY_MAP[code] ?? "other";
  }

  private mapStatusFromType(typeText: string): "open" | "closed" | "awarded" | "planned" {
    const lower = typeText.toLowerCase();
    if (lower.includes("award")) return "awarded";
    if (lower.includes("presolicitation") || lower.includes("sources sought")) return "planned";
    if (lower.includes("closed") || lower.includes("archived")) return "closed";
    return "open";
  }

  private parseDate(raw: string): Date | null {
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }
}
