-- Migration: Add shopping lists and list items tables
-- Run this SQL in your Supabase SQL Editor

-- Shopping lists table (one per family initially)
create table public.lists (
  id uuid not null default extensions.uuid_generate_v4(),
  family_id uuid not null,
  type text not null default 'grocery',
  name text not null default 'Shopping List',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint lists_pkey primary key (id),
  constraint lists_family_id_fkey foreign key (family_id)
    references families (id) on delete cascade
) tablespace pg_default;

-- List items
create table public.list_items (
  id uuid not null default extensions.uuid_generate_v4(),
  list_id uuid not null,
  title text not null,
  quantity text null,
  notes text null,
  added_by uuid not null,
  assigned_shopper uuid null,
  completed boolean not null default false,
  completed_by uuid null,
  completed_at timestamp with time zone null,
  position integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint list_items_pkey primary key (id),
  constraint list_items_list_id_fkey foreign key (list_id)
    references lists (id) on delete cascade,
  constraint list_items_added_by_fkey foreign key (added_by)
    references users (id) on delete cascade,
  constraint list_items_assigned_shopper_fkey foreign key (assigned_shopper)
    references users (id) on delete set null,
  constraint list_items_completed_by_fkey foreign key (completed_by)
    references users (id) on delete set null
) tablespace pg_default;

-- Indexes for performance
create index if not exists idx_lists_family_id
  on public.lists using btree (family_id) tablespace pg_default;

create index if not exists idx_list_items_list_id
  on public.list_items using btree (list_id) tablespace pg_default;

create index if not exists idx_list_items_completed
  on public.list_items using btree (completed) tablespace pg_default;

create index if not exists idx_list_items_position
  on public.list_items using btree (list_id, position) tablespace pg_default;

-- Enable Row Level Security
alter table public.lists enable row level security;
alter table public.list_items enable row level security;

-- Lists RLS Policies
create policy "Users can view their family's lists"
  on public.lists for select
  using (
    family_id in (
      select family_id from public.users where auth_user_id = auth.uid()
    )
  );

create policy "Users can create lists for their family"
  on public.lists for insert
  with check (
    family_id in (
      select family_id from public.users where auth_user_id = auth.uid()
    )
  );

create policy "Users can update their family's lists"
  on public.lists for update
  using (
    family_id in (
      select family_id from public.users where auth_user_id = auth.uid()
    )
  );

create policy "Users can delete their family's lists"
  on public.lists for delete
  using (
    family_id in (
      select family_id from public.users where auth_user_id = auth.uid()
    )
  );

-- List items RLS Policies
create policy "Users can view their family's list items"
  on public.list_items for select
  using (
    list_id in (
      select l.id from public.lists l
      inner join public.users u on l.family_id = u.family_id
      where u.auth_user_id = auth.uid()
    )
  );

create policy "Users can create list items for their family"
  on public.list_items for insert
  with check (
    list_id in (
      select l.id from public.lists l
      inner join public.users u on l.family_id = u.family_id
      where u.auth_user_id = auth.uid()
    )
  );

create policy "Users can update their family's list items"
  on public.list_items for update
  using (
    list_id in (
      select l.id from public.lists l
      inner join public.users u on l.family_id = u.family_id
      where u.auth_user_id = auth.uid()
    )
  );

create policy "Users can delete their family's list items"
  on public.list_items for delete
  using (
    list_id in (
      select l.id from public.lists l
      inner join public.users u on l.family_id = u.family_id
      where u.auth_user_id = auth.uid()
    )
  );

-- Trigger: Update list updated_at on item changes
create or replace function update_list_timestamp()
returns trigger as $$
begin
  update public.lists set updated_at = now()
  where id = coalesce(NEW.list_id, OLD.list_id);
  return coalesce(NEW, OLD);
end;
$$ language plpgsql;

create trigger update_list_on_item_change
  after insert or update or delete on public.list_items
  for each row
  execute function update_list_timestamp();

-- Trigger: Auto-create default shopping list for new families
create or replace function create_default_shopping_list()
returns trigger as $$
begin
  insert into public.lists (family_id, type, name)
  values (NEW.id, 'grocery', 'Shopping List');
  return NEW;
end;
$$ language plpgsql;

create trigger create_family_shopping_list
  after insert on public.families
  for each row
  execute function create_default_shopping_list();
