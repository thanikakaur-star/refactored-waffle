-- Migration: add World Bank as a tender source (procurement notices for
-- World Bank-financed development projects, incl. health-sector contracts).
-- Run this once in the Supabase SQL Editor on your existing database.

ALTER TYPE tender_source ADD VALUE IF NOT EXISTS 'world_bank';
