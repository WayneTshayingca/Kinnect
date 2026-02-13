-- Fix: create_default_shopping_list trigger fails RLS on "lists" table
-- during onboarding because the user record doesn't exist yet when the
-- trigger fires (family is created before the user is linked to it).
-- SECURITY DEFINER lets the trigger bypass RLS as a trusted server-side operation.

create or replace function create_default_shopping_list()
returns trigger
security definer
set search_path = public
as $$
begin
  insert into public.lists (family_id, type, name)
  values (NEW.id, 'grocery', 'Shopping List');
  return NEW;
end;
$$ language plpgsql;
