-- Migration: fix full-text search on tenders.
--
-- The original idx_tenders_search was a GIN index on the *expression*
-- to_tsvector('english', title || ' ' || description) — but PostgREST's
-- .textSearch(column, query) can only target an actual column, so the API
-- was searching title alone (missing anything only in the description) and
-- not using that index at all (a mismatched expression means a sequential
-- scan). This adds a real generated column matching what the index always
-- meant to cover, so search actually works and stays fast as data grows.
--
-- Run this once in the Supabase SQL Editor on your existing database.

DROP INDEX IF EXISTS idx_tenders_search;

ALTER TABLE tenders ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || coalesce(description, ''))) STORED;

CREATE INDEX IF NOT EXISTS idx_tenders_search ON tenders USING gin(search_vector);
