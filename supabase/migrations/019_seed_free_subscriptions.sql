-- Migration 019: Backfill free-tier subscriptions
-- Migration 018's trigger only covers families created from now on. This gives
-- every existing family a free row so application code can assume one exists.

INSERT INTO public.subscriptions (family_id, tier, status)
SELECT f.id, 'free', 'active'
FROM public.families f
ON CONFLICT (family_id) DO NOTHING;
