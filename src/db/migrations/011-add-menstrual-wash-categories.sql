-- Migration: add 'menstrual_health' and 'wash_hygiene' procurement categories.
-- Supports monitoring menstrual-health and water/sanitation/hygiene (WASH)
-- tenders (sanitary products, hygiene kits, school sanitation, dignity kits,
-- menstrual hygiene management) across all existing sources — TED, the UK
-- feeds, World Bank and UNGM — for menstrual-health market-entry work.
-- Run this once in the Supabase SQL Editor on your existing database.

ALTER TYPE procurement_category ADD VALUE IF NOT EXISTS 'menstrual_health';
ALTER TYPE procurement_category ADD VALUE IF NOT EXISTS 'wash_hygiene';
