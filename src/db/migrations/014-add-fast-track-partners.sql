-- Migration: multi-tenant white-label partners for the Fast-Track (CarePath)
-- consumer navigator. Non-destructive, additive only. Lets us license /fast-track
-- to UK employers, creators, pharmacies and community partners with their own
-- branding and access modes. Also adds partner attribution to unlocks for
-- revenue-share payout tracking. Run once in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS fast_track_partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  brand_name TEXT NOT NULL,
  primary_color TEXT NOT NULL DEFAULT '#2E5A44',
  logo_url TEXT,
  access_mode TEXT NOT NULL DEFAULT 'revenue_share' CHECK (access_mode IN ('sponsored_free', 'revenue_share')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fast_track_partners_slug ON fast_track_partners (slug) WHERE active;

-- Track which partner referred a paid unlock, for 50/50 revenue-share payouts.
ALTER TABLE fast_track_unlocks ADD COLUMN IF NOT EXISTS partner_slug TEXT;
CREATE INDEX IF NOT EXISTS idx_fast_track_unlocks_partner ON fast_track_unlocks (partner_slug);

-- Sample active partner (sponsored-free employer license).
INSERT INTO fast_track_partners (slug, brand_name, access_mode, active)
VALUES ('demo-employer', 'Partner Care Navigator', 'sponsored_free', true)
ON CONFLICT (slug) DO NOTHING;
