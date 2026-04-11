-- Migration 013: Responsibility Occurrences
-- One row per (flow, date). Pre-generated 90 days ahead via a trigger on
-- responsibility_flows INSERT so no client-side occurrence generation is needed.
--
-- recurrence_rule format:
--   'daily'          — every day
--   'weekdays'       — Mon–Fri (ISODOW 1–5)
--   'weekends'       — Sat–Sun (ISODOW 6–7)
--   'weekly:1,3,5'   — specific ISO day numbers (1=Mon … 7=Sun)

CREATE TABLE IF NOT EXISTS public.responsibility_occurrences (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id         UUID        NOT NULL REFERENCES public.responsibility_flows(id) ON DELETE CASCADE,
  family_id       UUID        NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  scheduled_for   DATE        NOT NULL,
  scheduled_time  TIME,
  assigned_to     UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status = ANY(ARRAY['pending','completed','missed','reassigned'])),
  override_reason TEXT,
  completed_at    TIMESTAMPTZ,
  completed_by    UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT responsibility_occurrences_flow_date_unique UNIQUE (flow_id, scheduled_for)
);

CREATE INDEX IF NOT EXISTS idx_resp_occurrences_family_date
  ON public.responsibility_occurrences(family_id, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_resp_occurrences_flow
  ON public.responsibility_occurrences(flow_id);
CREATE INDEX IF NOT EXISTS idx_resp_occurrences_assigned
  ON public.responsibility_occurrences(assigned_to, scheduled_for);

-- RLS
ALTER TABLE public.responsibility_occurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view their occurrences"
  ON public.responsibility_occurrences FOR SELECT
  USING (family_id = public.get_my_family_id());

CREATE POLICY "Family members can update their occurrences"
  ON public.responsibility_occurrences FOR UPDATE
  USING (family_id = public.get_my_family_id());

-- INSERT is handled by the trigger function (SECURITY DEFINER — bypasses RLS)

-- ── Trigger: generate 90-day occurrences on flow INSERT ─────────────────────

CREATE OR REPLACE FUNCTION public.generate_responsibility_occurrences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  occurrence_date  DATE;
  end_date         DATE;
  day_of_week      INT;      -- ISO: 1=Mon … 7=Sun
  weekly_days      INT[];
  raw_days         TEXT[];
  d                TEXT;
BEGIN
  occurrence_date := CURRENT_DATE;
  end_date        := CURRENT_DATE + INTERVAL '90 days';

  -- Parse 'weekly:1,3,5' into an int array
  IF NEW.recurrence_rule LIKE 'weekly:%' THEN
    raw_days := string_to_array(substring(NEW.recurrence_rule FROM 8), ',');
    FOREACH d IN ARRAY raw_days LOOP
      weekly_days := array_append(weekly_days, d::INT);
    END LOOP;
  END IF;

  WHILE occurrence_date <= end_date LOOP
    day_of_week := EXTRACT(ISODOW FROM occurrence_date)::INT;

    IF (
      NEW.recurrence_rule = 'daily'
      OR (NEW.recurrence_rule = 'weekdays'  AND day_of_week BETWEEN 1 AND 5)
      OR (NEW.recurrence_rule = 'weekends'  AND day_of_week IN (6, 7))
      OR (NEW.recurrence_rule LIKE 'weekly:%' AND day_of_week = ANY(weekly_days))
    ) THEN
      INSERT INTO public.responsibility_occurrences (
        flow_id,
        family_id,
        scheduled_for,
        scheduled_time,
        assigned_to,
        status
      ) VALUES (
        NEW.id,
        NEW.family_id,
        occurrence_date,
        NEW.start_time,
        NEW.default_assignee_id,
        'pending'
      )
      ON CONFLICT (flow_id, scheduled_for) DO NOTHING;
    END IF;

    occurrence_date := occurrence_date + INTERVAL '1 day';
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_responsibility_occurrences
  AFTER INSERT ON public.responsibility_flows
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_responsibility_occurrences();