-- Enable Supabase Realtime for live sync across family members.
-- This adds the tables to the supabase_realtime publication so that
-- Postgres changes are broadcast via WebSocket to subscribed clients.

alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.calendar_events;
alter publication supabase_realtime add table public.list_items;
alter publication supabase_realtime add table public.users;
