-- Notifications: per-user, family-scoped notification feed (mobile bell icon).
-- Consumer-only for now — no producers/triggers wired up yet. Rows are
-- inserted via service-role API routes only (see architecture rule: service
-- role key only in /api/* routes).

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  actor_id uuid references users(id) on delete set null,
  type text not null,
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on notifications (user_id, read_at);

create index if not exists notifications_family_idx
  on notifications (family_id);

alter table notifications enable row level security;

create policy "Users can view their own notifications"
  on notifications for select
  using (family_id = get_my_family_id() and user_id = (select id from users where auth_user_id = auth.uid()));

create policy "Users can mark their own notifications as read"
  on notifications for update
  using (family_id = get_my_family_id() and user_id = (select id from users where auth_user_id = auth.uid()))
  with check (family_id = get_my_family_id() and user_id = (select id from users where auth_user_id = auth.uid()));

-- Inserts are service-role only (no insert policy for authenticated users).

alter publication supabase_realtime add table notifications;
