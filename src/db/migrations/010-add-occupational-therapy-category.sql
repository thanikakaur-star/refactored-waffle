-- Migration: add 'occupational_therapy' procurement category. Splits OT out of
-- the combined allied_health (physio + OT) category so occupational therapy
-- services AND OT equipment (mobility aids, home adaptations, assistive tech,
-- daily living aids) can be filtered and benchmarked on their own.
-- Run this once in the Supabase SQL Editor on your existing database.

ALTER TYPE procurement_category ADD VALUE IF NOT EXISTS 'occupational_therapy';
