-- ============================================================================
-- MANUAL TENDER IMPORT — temporary workflow until the scrapers are verified.
--
-- Use this ONLY with REAL, current tenders you copy from the live source
-- (e.g. https://www.find-tender.service.gov.uk or
-- https://www.contractsfinder.service.gov.uk). Do NOT invent tenders.
--
-- HOW TO USE:
--   1. Open Find a Tender / Contracts Finder, search your category
--      (e.g. "surgical instruments", "medical devices", "occupational therapy").
--   2. For each real notice, copy its details into a duplicated INSERT block below.
--   3. The `url` MUST be the real link to that specific notice (not a homepage).
--   4. Run this in the Supabase SQL Editor.
--   5. Re-running is safe: ON CONFLICT (source, external_id) updates in place.
--
-- Valid `source` values:
--   'contracts_finder', 'find_a_tender', 'ted_europa', 'sam_gov',
--   'who_procurement', 'nhs_supply_chain', 'manual'
-- Valid `category` values:
--   'surgical_instruments', 'medical_devices', 'pharmaceuticals', 'health_it',
--   'laboratory_equipment', 'hospital_infrastructure',
--   'personal_protective_equipment', 'diagnostics', 'telemedicine',
--   'clinical_services', 'social_care', 'other'
-- Valid `status`: 'open', 'closed', 'awarded', 'cancelled', 'planned'
-- ============================================================================

INSERT INTO tenders (
  external_id, source, title, description,
  buyer_name, buyer_country, buyer_region,
  category, status, published_at, deadline,
  original_currency, original_value, value_usd,
  compliance_criteria, cpv_codes, url
) VALUES
  -- ----- TEMPLATE ROW — replace every <...> with real values, then duplicate -----
  (
    '<REAL_NOTICE_ID>',              -- external_id: the notice/reference number
    'find_a_tender',                 -- source
    '<REAL_TENDER_TITLE>',           -- title
    '<REAL_SHORT_DESCRIPTION>',      -- description
    '<REAL_BUYER_NAME>',             -- buyer_name (e.g. an NHS Trust)
    'GB',                            -- buyer_country
    'United Kingdom',                -- buyer_region
    'surgical_instruments',          -- category
    'open',                          -- status
    '<YYYY-MM-DD>T00:00:00Z',        -- published_at
    '<YYYY-MM-DD>T23:59:00Z',        -- deadline (closing date)
    'GBP',                           -- original_currency
    <REAL_VALUE_OR_NULL>,            -- original_value (a number, or NULL)
    <REAL_VALUE_OR_NULL>,            -- value_usd (GBP*1.27, or NULL)
    ARRAY['UK Public Contracts Regulations 2015'], -- compliance_criteria
    ARRAY['<CPV_CODE_OR_LEAVE>'],    -- cpv_codes (or ARRAY[]::text[])
    '<REAL_DIRECT_NOTICE_URL>'       -- url: link to THIS notice, not a homepage
  )
  -- ,( ... duplicate the block above for each additional real tender ... )
ON CONFLICT (source, external_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  buyer_name = EXCLUDED.buyer_name,
  category = EXCLUDED.category,
  status = EXCLUDED.status,
  deadline = EXCLUDED.deadline,
  value_usd = EXCLUDED.value_usd,
  url = EXCLUDED.url,
  updated_at = NOW();

-- Verify what you inserted:
--   SELECT title, buyer_name, category, deadline, url
--   FROM tenders WHERE source = 'find_a_tender' ORDER BY updated_at DESC;
