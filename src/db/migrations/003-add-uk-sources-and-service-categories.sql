-- Migration: add Contracts Finder / Find a Tender sources and
-- clinical_services / social_care procurement categories.
-- Run this once in the Supabase SQL Editor on your existing database.
-- Postgres requires enum additions to run outside a transaction block with
-- other statements that use the new value in the same transaction, but
-- ALTER TYPE ... ADD VALUE IF NOT EXISTS alone is safe to re-run.

ALTER TYPE tender_source ADD VALUE IF NOT EXISTS 'contracts_finder';
ALTER TYPE tender_source ADD VALUE IF NOT EXISTS 'find_a_tender';

ALTER TYPE procurement_category ADD VALUE IF NOT EXISTS 'clinical_services';
ALTER TYPE procurement_category ADD VALUE IF NOT EXISTS 'social_care';
