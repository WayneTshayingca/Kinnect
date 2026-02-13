-- Fix: Deleting a member should not cascade-delete calendar events or shopping
-- list items they created. Change ON DELETE CASCADE to ON DELETE SET NULL so the
-- data is preserved but the creator reference is cleared.

-- calendar_events.created_by: CASCADE → SET NULL
ALTER TABLE public.calendar_events
  DROP CONSTRAINT calendar_events_created_by_fkey,
  ALTER COLUMN created_by DROP NOT NULL,
  ADD CONSTRAINT calendar_events_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users (id) ON DELETE SET NULL;

-- list_items.added_by: CASCADE → SET NULL
ALTER TABLE public.list_items
  DROP CONSTRAINT list_items_added_by_fkey,
  ALTER COLUMN added_by DROP NOT NULL,
  ADD CONSTRAINT list_items_added_by_fkey
    FOREIGN KEY (added_by) REFERENCES public.users (id) ON DELETE SET NULL;

-- tasks.created_by: no action (RESTRICT) → SET NULL
-- This prevents deletion from failing when a member has created tasks.
ALTER TABLE public.tasks
  DROP CONSTRAINT tasks_created_by_fkey,
  ALTER COLUMN created_by DROP NOT NULL,
  ADD CONSTRAINT tasks_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users (id) ON DELETE SET NULL;

-- tasks.completed_by: no action (RESTRICT) → SET NULL
-- Already nullable, just fix the FK action.
ALTER TABLE public.tasks
  DROP CONSTRAINT tasks_completed_by_fkey,
  ADD CONSTRAINT tasks_completed_by_fkey
    FOREIGN KEY (completed_by) REFERENCES public.users (id) ON DELETE SET NULL;
