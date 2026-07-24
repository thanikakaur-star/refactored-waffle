-- Migration: add 'paramedic_services' and 'patient_transport' procurement
-- categories. Split out of the generic clinical_services bucket so ambulance /
-- paramedic / emergency medical services and (non-emergency) patient transport
-- tenders can be filtered and benchmarked on their own — and kept out of the
-- Allied Health (physio/OT) view.
-- Run this once in the Supabase SQL Editor on your existing database.

ALTER TYPE procurement_category ADD VALUE IF NOT EXISTS 'paramedic_services';
ALTER TYPE procurement_category ADD VALUE IF NOT EXISTS 'patient_transport';
