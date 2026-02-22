-- Migration: Initial schema — families, users, tasks
-- Run this SQL in your Supabase SQL Editor FIRST, before any other migrations.

-- ── Enable UUID extension (if not already enabled) ─────────────
create extension if not exists "uuid-ossp" with schema extensions;

-- ── Families ────────────────────────────────────────────────────

create table public.families (
  id uuid not null default extensions.uuid_generate_v4(),
  name text not null,
  primary_language text null default 'en'::text,
  created_at timestamp without time zone null default now(),

  constraint families_pkey primary key (id)
) tablespace pg_default;

-- Enable Row Level Security
alter table public.families enable row level security;

-- ── Users ───────────────────────────────────────────────────────

create table public.users (
  id uuid not null default extensions.uuid_generate_v4(),
  family_id uuid null,
  auth_user_id uuid null,
  name text not null,
  role text null,
  phone text null,
  avatar_url text null,
  language_preference text null default 'en'::text,
  push_token text null,
  points integer null default 0,
  created_at timestamp without time zone null default now(),

  constraint users_pkey primary key (id),
  constraint users_auth_user_id_fkey foreign key (auth_user_id)
    references auth.users (id) on delete cascade,
  constraint users_family_id_fkey foreign key (family_id)
    references families (id) on delete cascade,
  constraint users_role_check check (
    role = any (array['admin'::text, 'member'::text, 'dependent'::text, 'observer'::text])
  )
) tablespace pg_default;

create index if not exists idx_users_family
  on public.users using btree (family_id) tablespace pg_default;

create index if not exists idx_users_auth
  on public.users using btree (auth_user_id) tablespace pg_default;

-- Enable Row Level Security
alter table public.users enable row level security;

create policy "Users can view members of their family"
  on public.users for select
  using (
    family_id in (
      select family_id from public.users where auth_user_id = auth.uid()
    )
  );

create policy "Authenticated users can create a user record"
  on public.users for insert
  with check (auth.uid() is not null);

create policy "Users can update members of their family"
  on public.users for update
  using (
    family_id in (
      select family_id from public.users where auth_user_id = auth.uid()
    )
  );

create policy "Users can delete members of their family"
  on public.users for delete
  using (
    family_id in (
      select family_id from public.users where auth_user_id = auth.uid()
    )
  );

-- ── Families RLS (defined after users table exists) ─────────────

create policy "Users can view their own family"
  on public.families for select
  using (
    id in (
      select family_id from public.users where auth_user_id = auth.uid()
    )
  );

create policy "Authenticated users can create a family"
  on public.families for insert
  with check (auth.uid() is not null);

create policy "Users can update their own family"
  on public.families for update
  using (
    id in (
      select family_id from public.users where auth_user_id = auth.uid()
    )
  );

-- ── Tasks ───────────────────────────────────────────────────────

create table public.tasks (
  id uuid not null default extensions.uuid_generate_v4(),
  family_id uuid null,
  title text not null,
  description text null,
  assigned_to uuid[] null default '{}'::uuid[],
  due_date timestamp without time zone null,
  completed boolean null default false,
  completed_by uuid null,
  completed_at timestamp without time zone null,
  points integer null default 10,
  category text null,
  created_by uuid not null,
  created_at timestamp without time zone null default now(),

  constraint tasks_pkey primary key (id),
  constraint tasks_completed_by_fkey foreign key (completed_by)
    references users (id),
  constraint tasks_created_by_fkey foreign key (created_by)
    references users (id),
  constraint tasks_family_id_fkey foreign key (family_id)
    references families (id) on delete cascade
) tablespace pg_default;

create index if not exists idx_tasks_family
  on public.tasks using btree (family_id) tablespace pg_default;

create index if not exists idx_tasks_due_date
  on public.tasks using btree (due_date) tablespace pg_default;

create index if not exists idx_tasks_completed
  on public.tasks using btree (completed) tablespace pg_default;

create index if not exists idx_tasks_assigned
  on public.tasks using gin (assigned_to) tablespace pg_default;

-- Enable Row Level Security
alter table public.tasks enable row level security;

create policy "Users can view their family's tasks"
  on public.tasks for select
  using (
    family_id in (
      select family_id from public.users where auth_user_id = auth.uid()
    )
  );

create policy "Users can create tasks for their family"
  on public.tasks for insert
  with check (
    family_id in (
      select family_id from public.users where auth_user_id = auth.uid()
    )
  );

create policy "Users can update their family's tasks"
  on public.tasks for update
  using (
    family_id in (
      select family_id from public.users where auth_user_id = auth.uid()
    )
  );

create policy "Users can delete their family's tasks"
  on public.tasks for delete
  using (
    family_id in (
      select family_id from public.users where auth_user_id = auth.uid()
    )
  );
