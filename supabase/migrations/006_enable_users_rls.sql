-- Fix: RLS policies on "users" reference the "users" table itself, causing
-- infinite recursion. Create a SECURITY DEFINER helper to get the current
-- user's family_id without triggering RLS, then rebuild ALL policies that
-- subquery the users table.

-- Helper: get current user's family_id (bypasses RLS)
create or replace function public.get_my_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id from public.users where auth_user_id = auth.uid() limit 1;
$$;

-- Enable RLS on both tables
alter table public.families enable row level security;
alter table public.users enable row level security;

-- ═══════════════════════════════════════════════════════════════
-- USERS
-- ═══════════════════════════════════════════════════════════════

drop policy if exists "Users can view members of their family" on public.users;
drop policy if exists "Users can view their family's members" on public.users;
drop policy if exists "Users can view family members" on public.users;
drop policy if exists "Authenticated users can create a user record" on public.users;
drop policy if exists "Users can insert family members" on public.users;
drop policy if exists "Users can update members of their family" on public.users;
drop policy if exists "Users can update their profile" on public.users;
drop policy if exists "Users can update family members" on public.users;
drop policy if exists "Users can delete members of their family" on public.users;
drop policy if exists "Users can delete family members" on public.users;

create policy "Users can view family members"
  on public.users for select
  using (family_id = public.get_my_family_id());

create policy "Authenticated users can create a user record"
  on public.users for insert
  with check (auth.uid() is not null);

create policy "Users can update family members"
  on public.users for update
  using (family_id = public.get_my_family_id());

create policy "Users can delete family members"
  on public.users for delete
  using (family_id = public.get_my_family_id());

-- ═══════════════════════════════════════════════════════════════
-- FAMILIES
-- ═══════════════════════════════════════════════════════════════

drop policy if exists "Users can view their own family" on public.families;
drop policy if exists "Users can read their family" on public.families;
drop policy if exists "Authenticated users can create a family" on public.families;
drop policy if exists "authenticated_can_insert_families" on public.families;
drop policy if exists "Users can update their own family" on public.families;
drop policy if exists "Family admins can update their family" on public.families;

create policy "Users can view their own family"
  on public.families for select
  using (id = public.get_my_family_id());

create policy "Authenticated users can create a family"
  on public.families for insert
  with check (auth.uid() is not null);

create policy "Users can update their own family"
  on public.families for update
  using (id = public.get_my_family_id());

-- ═══════════════════════════════════════════════════════════════
-- TASKS
-- ═══════════════════════════════════════════════════════════════

drop policy if exists "Users can view their family's tasks" on public.tasks;
drop policy if exists "Users can create tasks for their family" on public.tasks;
drop policy if exists "Users can update their family's tasks" on public.tasks;
drop policy if exists "Users can delete their family's tasks" on public.tasks;

create policy "Users can view their family's tasks"
  on public.tasks for select
  using (family_id = public.get_my_family_id());

create policy "Users can create tasks for their family"
  on public.tasks for insert
  with check (family_id = public.get_my_family_id());

create policy "Users can update their family's tasks"
  on public.tasks for update
  using (family_id = public.get_my_family_id());

create policy "Users can delete their family's tasks"
  on public.tasks for delete
  using (family_id = public.get_my_family_id());

-- ═══════════════════════════════════════════════════════════════
-- CALENDAR EVENTS
-- ═══════════════════════════════════════════════════════════════

drop policy if exists "Users can view their family's calendar events" on public.calendar_events;
drop policy if exists "Users can create calendar events for their family" on public.calendar_events;
drop policy if exists "Users can update their family's calendar events" on public.calendar_events;
drop policy if exists "Users can delete their family's calendar events" on public.calendar_events;

create policy "Users can view their family's calendar events"
  on public.calendar_events for select
  using (family_id = public.get_my_family_id());

create policy "Users can create calendar events for their family"
  on public.calendar_events for insert
  with check (family_id = public.get_my_family_id());

create policy "Users can update their family's calendar events"
  on public.calendar_events for update
  using (family_id = public.get_my_family_id());

create policy "Users can delete their family's calendar events"
  on public.calendar_events for delete
  using (family_id = public.get_my_family_id());

-- ═══════════════════════════════════════════════════════════════
-- LISTS (shopping lists)
-- ═══════════════════════════════════════════════════════════════

drop policy if exists "Users can view their family's lists" on public.lists;
drop policy if exists "Users can create lists for their family" on public.lists;
drop policy if exists "Users can update their family's lists" on public.lists;
drop policy if exists "Users can delete their family's lists" on public.lists;

create policy "Users can view their family's lists"
  on public.lists for select
  using (family_id = public.get_my_family_id());

create policy "Users can create lists for their family"
  on public.lists for insert
  with check (family_id = public.get_my_family_id());

create policy "Users can update their family's lists"
  on public.lists for update
  using (family_id = public.get_my_family_id());

create policy "Users can delete their family's lists"
  on public.lists for delete
  using (family_id = public.get_my_family_id());

-- ═══════════════════════════════════════════════════════════════
-- LIST ITEMS
-- ═══════════════════════════════════════════════════════════════

drop policy if exists "Users can view their family's list items" on public.list_items;
drop policy if exists "Users can create list items for their family" on public.list_items;
drop policy if exists "Users can update their family's list items" on public.list_items;
drop policy if exists "Users can delete their family's list items" on public.list_items;

create policy "Users can view their family's list items"
  on public.list_items for select
  using (
    list_id in (
      select id from public.lists where family_id = public.get_my_family_id()
    )
  );

create policy "Users can create list items for their family"
  on public.list_items for insert
  with check (
    list_id in (
      select id from public.lists where family_id = public.get_my_family_id()
    )
  );

create policy "Users can update their family's list items"
  on public.list_items for update
  using (
    list_id in (
      select id from public.lists where family_id = public.get_my_family_id()
    )
  );

create policy "Users can delete their family's list items"
  on public.list_items for delete
  using (
    list_id in (
      select id from public.lists where family_id = public.get_my_family_id()
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- RPC: atomic family + user creation (bypasses RLS)
-- ═══════════════════════════════════════════════════════════════

drop function if exists public.create_family_with_user(text,uuid,uuid,text,text);
drop function if exists public.create_family_with_user(text,uuid,text,text);
create or replace function public.create_family_with_user(
  family_name text,
  auth_uid uuid,
  user_name text,
  primary_lang text default 'en'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_family_id uuid;
begin
  -- Create the family
  insert into public.families (name, primary_language)
  values (family_name, primary_lang)
  returning id into new_family_id;

  -- Link existing user record to the family (preserve name from signup)
  update public.users
    set family_id = new_family_id,
        name      = coalesce(nullif(users.name, ''), user_name),
        role      = 'admin'
    where auth_user_id = auth_uid;

  -- If no user record exists yet, create one
  if not found then
    insert into public.users (auth_user_id, family_id, name, role)
    values (auth_uid, new_family_id, user_name, 'admin');
  end if;

  return new_family_id;
end;
$$;
