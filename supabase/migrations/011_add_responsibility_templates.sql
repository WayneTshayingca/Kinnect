-- Migration 011: Responsibility Templates
-- Creates the responsibility_templates table and seeds 4 system templates.
-- Templates are read-only global reference data — no RLS required.

CREATE TABLE IF NOT EXISTS public.responsibility_templates (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL,
  slug                TEXT        NOT NULL UNIQUE,
  icon                TEXT        NOT NULL,
  category            TEXT        NOT NULL CHECK (category = ANY(ARRAY['transport','household','care','errand'])),
  default_start_time  TIME,
  is_system           BOOLEAN     NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_responsibility_templates_slug ON public.responsibility_templates(slug);
CREATE INDEX IF NOT EXISTS idx_responsibility_templates_system ON public.responsibility_templates(is_system) WHERE is_system = true;

-- Seed 4 system templates
INSERT INTO public.responsibility_templates (name, slug, icon, category, default_start_time, is_system) VALUES
  ('School Run',       'school_run',       '🚗', 'transport', '07:15', true),
  ('Shopping Duty',    'shopping_duty',    '🛒', 'errand',    '10:00', true),
  ('Household Errand', 'household_errand', '🏠', 'household', '09:00', true),
  ('Staff Visit',      'staff_visit',      '👷', 'household', '08:00', true)
ON CONFLICT (slug) DO NOTHING;