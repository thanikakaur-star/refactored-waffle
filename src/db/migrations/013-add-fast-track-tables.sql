-- Migration: add Fast-Track (CarePath) consumer vertical tables. Non-destructive,
-- additive only. Powers the consumer-facing /fast-track navigator: private-clinic
-- and holistic-practitioner lead capture, practitioner directory applications, and
-- Stripe consumer unlocks (one-off Fast-Track Pass / Family Pass). These are
-- separate from the B2B api_keys / tenders / Stripe subscription flow.
-- Run once in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS fast_track_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lead_type TEXT NOT NULL CHECK (lead_type IN ('private_clinic', 'holistic_practitioner_inquiry')),
  patient_name TEXT,
  email TEXT,
  phone TEXT,
  postcode TEXT,
  condition TEXT,
  patient_type TEXT,
  preferred_format TEXT CHECK (preferred_format IN ('in_person', 'remote')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new'
);

CREATE TABLE IF NOT EXISTS practitioner_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  practice_name TEXT,
  practitioner_name TEXT,
  specialty TEXT CHECK (specialty IN ('Homeopathy', 'Acupuncture', 'Osteopathy', 'Nutritional Therapy', 'Pelvic Health', 'Other')),
  accreditation_body TEXT,
  postcode TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review'
);

CREATE TABLE IF NOT EXISTS fast_track_unlocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stripe_session_id TEXT,
  email TEXT,
  postcode TEXT,
  condition TEXT,
  plan_type TEXT CHECK (plan_type IN ('one_off_499', 'family_monthly_799')),
  unlocked BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_fast_track_leads_created ON fast_track_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fast_track_leads_status ON fast_track_leads (status);
CREATE INDEX IF NOT EXISTS idx_practitioner_applications_status ON practitioner_applications (status);
CREATE INDEX IF NOT EXISTS idx_fast_track_unlocks_session ON fast_track_unlocks (stripe_session_id);
