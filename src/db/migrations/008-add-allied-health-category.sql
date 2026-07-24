-- Migration: add 'allied_health' procurement category — allied health
-- professions / rehabilitation therapies, principally OCCUPATIONAL THERAPY and
-- PHYSIOTHERAPY (also speech & language therapy, dietetics, podiatry). These
-- were previously folded into 'clinical_services'; this splits them out so
-- OT/physio service tenders can be filtered and benchmarked on their own.
-- Run this once in the Supabase SQL Editor on your existing database.

ALTER TYPE procurement_category ADD VALUE IF NOT EXISTS 'allied_health';
