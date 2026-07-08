import { getSupabaseClient } from "../db/client.js";
import { logger } from "../utils/logger.js";
import type { Tender, ContractAward } from "../types/index.js";

/**
 * Upserts scraped tenders into Supabase, keyed on (source, external_id) —
 * matches the UNIQUE constraint in schema.sql, so re-scraping an existing
 * tender updates it in place instead of duplicating it.
 */
export async function persistTenders(tenders: Partial<Tender>[]): Promise<{ persisted: number; failed: number }> {
  if (tenders.length === 0) return { persisted: 0, failed: 0 };

  const client = getSupabaseClient();
  const rows = tenders
    .filter((t) => t.externalId && t.source && t.title && t.buyerName && t.publishedAt && t.url)
    .map((t) => ({
      external_id: t.externalId,
      source: t.source,
      title: t.title,
      description: t.description ?? "",
      buyer_name: t.buyerName,
      buyer_country: t.buyerCountry ?? "",
      buyer_region: t.buyerRegion ?? "",
      category: t.category ?? "other",
      status: t.status ?? "open",
      published_at: (t.publishedAt as Date).toISOString(),
      deadline: t.deadline ? (t.deadline as Date).toISOString() : null,
      original_currency: t.originalCurrency ?? "USD",
      original_value: t.originalValue ?? null,
      value_usd: t.valueUsd ?? null,
      compliance_criteria: t.complianceCriteria ?? [],
      cpv_codes: t.cpvCodes ?? [],
      url: t.url,
      raw_data: t.rawData ?? {},
      updated_at: new Date().toISOString(),
    }));

  const skipped = tenders.length - rows.length;
  if (skipped > 0) {
    logger.warn("Skipping tenders missing required fields", { skipped });
  }
  if (rows.length === 0) return { persisted: 0, failed: skipped };

  const { error, count } = await client
    .from("tenders")
    .upsert(rows, { onConflict: "source,external_id", count: "exact" });

  if (error) {
    logger.error("Failed to persist tenders", { error: error.message });
    return { persisted: 0, failed: rows.length };
  }

  return { persisted: count ?? rows.length, failed: skipped };
}

/**
 * Inserts scraped contract awards. Awards aren't deduplicated (no unique
 * constraint in schema.sql) — safe as long as scrapers only extract awards
 * that are genuinely new since the last run.
 */
export async function persistAwards(awards: Partial<ContractAward>[]): Promise<{ persisted: number; failed: number }> {
  if (awards.length === 0) return { persisted: 0, failed: 0 };

  const client = getSupabaseClient();
  const rows = awards
    .filter((a) => a.supplierName && a.awardDate && a.source && a.awardValue != null)
    .map((a) => ({
      tender_id: a.tenderId ?? null,
      award_date: (a.awardDate as Date).toISOString(),
      supplier_name: a.supplierName,
      supplier_country: a.supplierCountry ?? "",
      original_currency: a.originalCurrency ?? "USD",
      award_value: a.awardValue,
      award_value_usd: a.awardValueUsd ?? a.awardValue,
      framework_type: a.frameworkType ?? null,
      duration: a.duration ?? null,
      source: a.source,
    }));

  const skipped = awards.length - rows.length;
  if (rows.length === 0) return { persisted: 0, failed: skipped };

  const { error, count } = await client.from("contract_awards").insert(rows, { count: "exact" });

  if (error) {
    logger.error("Failed to persist awards", { error: error.message });
    return { persisted: 0, failed: rows.length };
  }

  return { persisted: count ?? rows.length, failed: skipped };
}
