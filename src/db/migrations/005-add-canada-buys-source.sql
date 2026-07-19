-- Migration: add CanadaBuys as a tender source (Canadian federal/provincial
-- procurement notices, incl. health-sector contracts via UNSPSC segments
-- 42/51/85). Run this once in the Supabase SQL Editor on your existing
-- database.

ALTER TYPE tender_source ADD VALUE IF NOT EXISTS 'canada_buys';
