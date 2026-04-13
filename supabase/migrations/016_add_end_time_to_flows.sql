-- Migration 016: Add end_time to responsibility_flows
--
-- Adds an optional end_time (pick-up / return time) to flows.
-- Primarily useful for transport routines like school runs where a
-- driver needs both a drop-off time (start_time) and a pick-up time (end_time).
--
-- The existing update_responsibility_flow RPC is replaced with a version that
-- accepts an optional p_end_time parameter (DEFAULT NULL keeps existing callers working).

ALTER TABLE public.responsibility_flows
  ADD COLUMN IF NOT EXISTS end_time TIME;

-- Replace RPC to include end_time support
CREATE OR REPLACE FUNCTION public.update_responsibility_flow(
  p_flow_id             UUID,
  p_title               TEXT,
  p_category            TEXT,
  p_recurrence_rule     TEXT,
  p_default_assignee_id UUID,
  p_start_time          TIME,
  p_end_time            TIME DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id     UUID;
  v_old_rule      TEXT;
  v_today         DATE    := CURRENT_DATE;
  occurrence_date DATE;
  end_date        DATE;
  day_of_week     INT;
  weekly_days     INT[];
  raw_days        TEXT[];
  d               TEXT;
BEGIN
  -- 1. Security: confirm the flow belongs to the caller's active family
  SELECT family_id, recurrence_rule
  INTO   v_family_id, v_old_rule
  FROM   public.responsibility_flows
  WHERE  id        = p_flow_id
  AND    family_id = public.get_my_family_id();

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'Flow not found or access denied';
  END IF;

  -- 2. Update the flow row
  UPDATE public.responsibility_flows
  SET    title               = p_title,
         category            = p_category,
         recurrence_rule     = p_recurrence_rule,
         default_assignee_id = p_default_assignee_id,
         start_time          = p_start_time,
         end_time            = p_end_time
  WHERE  id = p_flow_id;

  -- 3. If recurrence_rule changed: delete + regenerate future occurrences
  IF p_recurrence_rule IS DISTINCT FROM v_old_rule THEN

    DELETE FROM public.responsibility_occurrences
    WHERE  flow_id      = p_flow_id
    AND    status       = 'pending'
    AND    scheduled_for >= v_today;

    IF p_recurrence_rule LIKE 'weekly:%' THEN
      raw_days := string_to_array(substring(p_recurrence_rule FROM 8), ',');
      FOREACH d IN ARRAY raw_days LOOP
        weekly_days := array_append(weekly_days, d::INT);
      END LOOP;
    END IF;

    occurrence_date := v_today;
    end_date        := v_today + INTERVAL '90 days';

    WHILE occurrence_date <= end_date LOOP
      day_of_week := EXTRACT(ISODOW FROM occurrence_date)::INT;

      IF (
        p_recurrence_rule = 'daily'
        OR (p_recurrence_rule = 'weekdays'    AND day_of_week BETWEEN 1 AND 5)
        OR (p_recurrence_rule = 'weekends'    AND day_of_week IN (6, 7))
        OR (p_recurrence_rule LIKE 'weekly:%' AND day_of_week = ANY(weekly_days))
      ) THEN
        INSERT INTO public.responsibility_occurrences (
          flow_id, family_id, scheduled_for, scheduled_time, assigned_to, status
        ) VALUES (
          p_flow_id, v_family_id, occurrence_date, p_start_time, p_default_assignee_id, 'pending'
        )
        ON CONFLICT (flow_id, scheduled_for) DO NOTHING;
      END IF;

      occurrence_date := occurrence_date + INTERVAL '1 day';
    END LOOP;

  ELSE
    -- 4. Rule unchanged: patch time + assignee on future pending rows
    UPDATE public.responsibility_occurrences
    SET    scheduled_time = p_start_time,
           assigned_to   = p_default_assignee_id
    WHERE  flow_id        = p_flow_id
    AND    status         = 'pending'
    AND    scheduled_for  >= v_today;
  END IF;

END;
$$;
