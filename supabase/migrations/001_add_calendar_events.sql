-- Migration: Add calendar_events table
-- Run this SQL in your Supabase SQL Editor

create table public.calendar_events (
  id uuid not null default extensions.uuid_generate_v4(),
  family_id uuid not null,
  title text not null,
  description text null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  all_day boolean not null default false,
  created_by uuid not null,
  created_at timestamp with time zone not null default now(),
  
  constraint calendar_events_pkey primary key (id),
  constraint calendar_events_family_id_fkey foreign key (family_id) 
    references families (id) on delete cascade,
  constraint calendar_events_created_by_fkey foreign key (created_by) 
    references users (id) on delete cascade
) tablespace pg_default;

-- Create indexes for better query performance
create index if not exists idx_calendar_events_family 
  on public.calendar_events using btree (family_id) tablespace pg_default;

create index if not exists idx_calendar_events_start_time 
  on public.calendar_events using btree (start_time) tablespace pg_default;

-- Enable Row Level Security
alter table public.calendar_events enable row level security;

-- RLS Policy: Users can only see events from their family
create policy "Users can view their family's calendar events"
  on public.calendar_events for select
  using (
    family_id in (
      select family_id from public.users where auth_user_id = auth.uid()
    )
  );

-- RLS Policy: Users can create events for their family
create policy "Users can create calendar events for their family"
  on public.calendar_events for insert
  with check (
    family_id in (
      select family_id from public.users where auth_user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update events in their family
create policy "Users can update their family's calendar events"
  on public.calendar_events for update
  using (
    family_id in (
      select family_id from public.users where auth_user_id = auth.uid()
    )
  );

-- RLS Policy: Users can delete events in their family
create policy "Users can delete their family's calendar events"
  on public.calendar_events for delete
  using (
    family_id in (
      select family_id from public.users where auth_user_id = auth.uid()
    )
  );
