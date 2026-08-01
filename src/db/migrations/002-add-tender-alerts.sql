-- Migration: add tender_alerts table for saved tender alerts (email notifications)
-- Run this once in the Supabase SQL Editor on your existing database.
-- Safe to re-run (uses IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS tender_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  category procurement_category,
  source tender_source,
  region TEXT,
  country TEXT,
  keyword TEXT,
  is_active BOOLEAN DEFAULT true,
  last_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tender_alerts_api_key ON tender_alerts(api_key_id);
CREATE INDEX IF NOT EXISTS idx_tender_alerts_active ON tender_alerts(is_active);
