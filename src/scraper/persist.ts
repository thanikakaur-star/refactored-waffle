import { getSupabaseClient } from "../db/client.js";
import { logger } from "../utils/logger.js";
import type { Tender, ContractAward } from "../types/index.js";

/**
 * Upserts scraped tenders into Supabase, keyed on (source, external_id) —
 * matches the UNIQUE constraint in schema.sql, so re-scraping an existing
 * tender updates it in place instead of duplicating it.
 */
export async function persistTenders(
  tenders: Partial<Tender>[],
): Promise<{ persisted: number; failed: number; idsByExternalId: Map<string, string> }> {
  if (tenders.length === 0) return { persisted: 0, failed: 0, idsByExternalId: new Map() };

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
  if (rows.length === 0) return { persisted: 0, failed: skipped, idsByExternalId: new Map() };

  // Postgres rejects a single upsert batch outright if two rows share the
  // same ON CONFLICT target (source, external_id) — some source feeds (e.g.
  // Contracts Finder OCDS) emit multiple releases per notice under the same
  // id, which would otherwise fail the whole batch. Keep the last occurrence
  // of each key.
  const dedupedByKey = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    dedupedByKey.set(`${row.source}::${row.external_id}`, row);
  }
  const dedupedRows = [...dedupedByKey.values()];
  const duplicatesDropped = rows.length - dedupedRows.length;
  if (duplicatesDropped > 0) {
    logger.warn("Dropped duplicate (source, external_id) rows within batch", { duplicatesDropped });
  }

  const { data, error, count } = await client
    .from("tenders")
    .upsert(dedupedRows, { onConflict: "source,external_id", count: "exact" })
    .select("id, external_id");

  if (error) {
    logger.error("Failed to persist tenders", { error: error.message });
    return { persisted: 0, failed: rows.length, idsByExternalId: new Map() };
  }

  const idsByExternalId = new Map<string, string>(
    (data ?? []).map((r: { id: string; external_id: string }) => [r.external_id, r.id]),
  );

  return { persisted: count ?? dedupedRows.length, failed: skipped, idsByExternalId };
}

/**
 * Upserts scraped contract awards, keyed on (source, external_id) when the
 * scraper supplies a stable award id (e.g. OCDS award.id) — matches the
 * UNIQUE constraint added in migration 006, so re-scraping the same OCDS
 * release (award data comes back on every fetch, not just once) updates the
 * existing row instead of duplicating it forever. Awards without an
 * external_id (e.g. the Playwright-based TED scraper) fall back to a plain
 * insert — Postgres treats every NULL as distinct, so they never collide
 * with the uniqueness constraint, matching the prior insert-only behavior.
 */
export async function persistAwards(awards: Partial<ContractAward>[]): Promise<{ persisted: number; failed: number }> {
  if (awards.length === 0) return { persisted: 0, failed: 0 };

  const client = getSupabaseClient();
  const rows = awards
    .filter((a) => a.supplierName && a.awardDate && a.source && a.awardValue != null)
    .map((a) => ({
      external_id: a.externalId ?? null,
      tender_id: a.tenderId ?? null,
      tender_title: a.tenderTitle ?? null,
      category: a.category ?? null,
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

  const { error, count } = await client
    .from("contract_awards")
    .upsert(rows, { onConflict: "source,external_id", count: "exact" });

  if (error) {
    logger.error("Failed to persist awards", { error: error.message });
    return { persisted: 0, failed: rows.length };
  }

  return { persisted: count ?? rows.length, failed: skipped };
}
