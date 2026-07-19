-- Migration: add external_id, tender_title, and category to contract_awards.
--
-- external_id + UNIQUE(source, external_id) lets scrapers upsert awards
-- instead of blindly inserting — needed because OCDS sources (Find a
-- Tender, Contracts Finder) return award data embedded in every tender
-- fetch, not just once, so without dedup the same award would duplicate on
-- every daily scrape. Existing rows keep external_id NULL, which is safe:
-- Postgres treats every NULL as distinct under a UNIQUE constraint, so they
-- never collide with each other or with new rows.
--
-- tender_title/category let awards be filtered by procurement category
-- (e.g. "who won surgical instrument contracts") without a join, and shown
-- with readable context even when tender_id can't be resolved.
--
-- Run this once in the Supabase SQL Editor on your existing database.

ALTER TABLE contract_awards ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE contract_awards ADD COLUMN IF NOT EXISTS tender_title TEXT;
ALTER TABLE contract_awards ADD COLUMN IF NOT EXISTS category procurement_category;

-- Plain ADD CONSTRAINT has no IF NOT EXISTS in Postgres, so wrap it to make
-- this migration safe to re-run.
DO $$
BEGIN
  ALTER TABLE contract_awards
    ADD CONSTRAINT contract_awards_source_external_id_key UNIQUE (source, external_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
