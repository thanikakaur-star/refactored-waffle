-- HealthProcure Intel — Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor to initialize the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE tender_source AS ENUM (
  'ted_europa', 'sam_gov', 'who_procurement', 'nhs_supply_chain', 'manual'
);

CREATE TYPE tender_status AS ENUM (
  'open', 'closed', 'awarded', 'cancelled', 'planned'
);

CREATE TYPE procurement_category AS ENUM (
  'medical_devices', 'pharmaceuticals', 'health_it', 'laboratory_equipment',
  'hospital_infrastructure', 'personal_protective_equipment', 'diagnostics',
  'surgical_instruments', 'telemedicine', 'other'
);

CREATE TYPE api_tier AS ENUM ('free', 'basic', 'pro', 'enterprise');

-- Core tenders table
CREATE TABLE IF NOT EXISTS tenders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT NOT NULL,
  source tender_source NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  buyer_name TEXT NOT NULL,
  buyer_country TEXT NOT NULL,
  buyer_region TEXT DEFAULT '',
  category procurement_category DEFAULT 'other',
  status tender_status DEFAULT 'open',
  published_at TIMESTAMPTZ NOT NULL,
  deadline TIMESTAMPTZ,
  original_currency TEXT NOT NULL DEFAULT 'USD',
  original_value NUMERIC,
  value_usd NUMERIC,
  compliance_criteria TEXT[] DEFAULT '{}',
  cpv_codes TEXT[] DEFAULT '{}',
  url TEXT NOT NULL,
  raw_data JSONB DEFAULT '{}',
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source, external_id)
);

-- Contract awards
CREATE TABLE IF NOT EXISTS contract_awards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  award_date TIMESTAMPTZ NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_country TEXT DEFAULT '',
  original_currency TEXT NOT NULL DEFAULT 'USD',
  award_value NUMERIC NOT NULL,
  award_value_usd NUMERIC NOT NULL,
  framework_type TEXT,
  duration TEXT,
  source tender_source NOT NULL,
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-computed regional benchmarks
CREATE TABLE IF NOT EXISTS supply_chain_benchmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  region TEXT NOT NULL,
  category procurement_category NOT NULL,
  avg_lead_time_days NUMERIC,
  avg_contract_value_usd NUMERIC,
  tender_count INTEGER DEFAULT 0,
  award_count INTEGER DEFAULT 0,
  compliance_rate NUMERIC,
  period TEXT NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(region, category, period)
);

-- API keys for customer access
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  tier api_tier DEFAULT 'free',
  is_active BOOLEAN DEFAULT true,
  request_count INTEGER DEFAULT 0,
  daily_request_count INTEGER DEFAULT 0,
  daily_reset_date DATE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT
);

-- Scrape run logs
CREATE TABLE IF NOT EXISTS scrape_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source tender_source NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  tenders_found INTEGER DEFAULT 0,
  tenders_new INTEGER DEFAULT 0,
  tenders_updated INTEGER DEFAULT 0,
  awards_found INTEGER DEFAULT 0,
  errors TEXT[] DEFAULT '{}',
  duration_ms INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running'
);

-- Indexes for query performance
CREATE INDEX idx_tenders_source ON tenders(source);
CREATE INDEX idx_tenders_status ON tenders(status);
CREATE INDEX idx_tenders_category ON tenders(category);
CREATE INDEX idx_tenders_country ON tenders(buyer_country);
CREATE INDEX idx_tenders_published ON tenders(published_at DESC);
CREATE INDEX idx_tenders_value ON tenders(value_usd DESC NULLS LAST);
CREATE INDEX idx_tenders_search ON tenders USING gin(to_tsvector('english', title || ' ' || description));
CREATE INDEX idx_awards_tender ON contract_awards(tender_id);
CREATE INDEX idx_awards_date ON contract_awards(award_date DESC);
CREATE INDEX idx_benchmarks_region ON supply_chain_benchmarks(region, category);
CREATE INDEX idx_api_keys_key ON api_keys(key);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenders_updated_at
  BEFORE UPDATE ON tenders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_chain_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_runs ENABLE ROW LEVEL SECURITY;

-- service_role bypasses RLS automatically — these policies govern anon/authenticated access

-- Public data: anon can read tenders and awards (the product we sell access to via API keys)
CREATE POLICY "anon_read_tenders"
  ON tenders FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_awards"
  ON contract_awards FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_benchmarks"
  ON supply_chain_benchmarks FOR SELECT TO anon USING (true);

-- api_keys: no anon access — only service_role (server-side) can read/write
-- This prevents anyone with the anon key from listing or forging API keys

-- scrape_runs: no anon access — internal operational data
-- service_role handles all inserts/reads from the scraper pipeline

-- authenticated users can read their own API key record (for a future self-service portal)
CREATE POLICY "authenticated_read_own_api_key"
  ON api_keys FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);
