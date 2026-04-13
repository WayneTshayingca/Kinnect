-- Migration 012: Responsibility Flows
-- A flow is a recurring responsibility routine (e.g. "School Run every weekday at 07:15").
-- Occurrences are generated automatically by migration 013's trigger on INSERT.

CREATE TABLE IF NOT EXISTS public.responsibility_flows (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id           UUID        NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  title               TEXT        NOT NULL,
  category            TEXT        NOT NULL CHECK (category = ANY(ARRAY['transport','household','care','errand'])),
  template_id         UUID        REFERENCES public.responsibility_templates(id) ON DELETE SET NULL,
  recurrence_rule     TEXT        NOT NULL,
  default_assignee_id UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  backup_assignee_ids UUID[]      NOT NULL DEFAULT '{}',
  start_time          TIME,
  active              BOOLEAN     NOT NULL DEFAULT true,
  created_by          UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_responsibility_flows_family  ON public.responsibility_flows(family_id);
CREATE INDEX IF NOT EXISTS idx_responsibility_flows_active  ON public.responsibility_flows(family_id, active) WHERE active = true;

-- RLS
ALTER TABLE public.responsibility_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view their flows"
  ON public.responsibility_flows FOR SELECT
  USING (family_id = public.get_my_family_id());

CREATE POLICY "Family members can create flows"
  ON public.responsibility_flows FOR INSERT
  WITH CHECK (family_id = public.get_my_family_id());

CREATE POLICY "Family members can update their flows"
  ON public.responsibility_flows FOR UPDATE
  USING (family_id = public.get_my_family_id());

CREATE POLICY "Family members can delete their flows"
  ON public.responsibility_flows FOR DELETE
  USING (family_id = public.get_my_family_id());