-- Migration: add per-day request counting to api_keys
-- Run this once in the Supabase SQL Editor on your existing database.
-- Safe to re-run (uses IF NOT EXISTS).

ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS daily_request_count INTEGER DEFAULT 0;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS daily_reset_date DATE;
