-- Migration: Add location column to calendar_events
-- Run this SQL in your Supabase SQL Editor

alter table public.calendar_events
  add column if not exists location text null;
