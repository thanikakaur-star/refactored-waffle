-- Migration: add 'un_agencies' tender source for UNICEF Supply Division and
-- UNFPA procurement notices — the UN system's largest procurers of menstrual-
-- health, hygiene and WASH supplies. Complements the existing who_procurement
-- (WHO / UNGM) source with dedicated agency coverage.
-- Run this once in the Supabase SQL Editor on your existing database.

ALTER TYPE tender_source ADD VALUE IF NOT EXISTS 'un_agencies';
