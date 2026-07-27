-- Seed saved tender alerts for the Asan menstrual-health market-entry project.
-- Creates region- and country-level alerts for the menstrual_health and
-- wash_hygiene categories across Asan's four target regions, so new matching
-- tenders (from TED, the UK feeds, World Bank and UNGM) trigger email digests.
--
-- Run AFTER 011-add-menstrual-wash-categories.sql, in the Supabase SQL Editor.
-- Alerts are attached to the most recently created active API key for the
-- given email. Change :email if you want them under a different account.
--
-- Region-level alerts are the robust default: buyer_country strings vary by
-- source (e.g. World Bank stores "United Republic of Tanzania"), whereas the
-- region bucket is normalised by src/scraper/regions.ts. Per-country alerts are
-- also seeded for exact-name matches.

DO $$
DECLARE
  v_email TEXT := 't.kaur-scille@lse.ac.uk';   -- <-- change if needed
  v_key   UUID;
  v_cat   TEXT;
  v_region TEXT;
  v_country TEXT;
  regions TEXT[] := ARRAY['East Africa','South Asia','Europe','Global'];
  countries TEXT[] := ARRAY[
    'Rwanda','Kenya','Uganda','United Republic of Tanzania','Malawi',
    'India','Bangladesh','Ireland'
  ];
  cats TEXT[] := ARRAY['menstrual_health','wash_hygiene'];
BEGIN
  SELECT id INTO v_key
  FROM api_keys
  WHERE email = v_email AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'No active API key found for %; sign up / provision a key first.', v_email;
  END IF;

  -- Region-level alerts
  FOREACH v_cat IN ARRAY cats LOOP
    FOREACH v_region IN ARRAY regions LOOP
      IF NOT EXISTS (
        SELECT 1 FROM tender_alerts
        WHERE api_key_id = v_key AND category = v_cat::procurement_category
          AND region = v_region AND country IS NULL
      ) THEN
        INSERT INTO tender_alerts (api_key_id, email, category, region, is_active)
        VALUES (v_key, v_email, v_cat::procurement_category, v_region, true);
      END IF;
    END LOOP;
  END LOOP;

  -- Per-country alerts (both categories)
  FOREACH v_cat IN ARRAY cats LOOP
    FOREACH v_country IN ARRAY countries LOOP
      IF NOT EXISTS (
        SELECT 1 FROM tender_alerts
        WHERE api_key_id = v_key AND category = v_cat::procurement_category
          AND country = v_country
      ) THEN
        INSERT INTO tender_alerts (api_key_id, email, category, country, is_active)
        VALUES (v_key, v_email, v_cat::procurement_category, v_country, true);
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Asan alerts seeded for key %', v_key;
END $$;
