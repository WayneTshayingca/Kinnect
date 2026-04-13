-- Migration 014: Enable Realtime for Responsibility tables
-- Adds responsibility_flows and responsibility_occurrences to the Supabase
-- realtime publication so cross-device sync works for the dashboard widget.

ALTER PUBLICATION supabase_realtime ADD TABLE public.responsibility_flows;
ALTER PUBLICATION supabase_realtime ADD TABLE public.responsibility_occurrences;