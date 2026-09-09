-- Migration 018: Subscriptions (PayFast Premium)
-- One row per family holding its billing tier. Families read their own row;
-- all writes come from the PayFast ITN webhook via the service role, so there
-- are deliberately no INSERT/UPDATE/DELETE policies for authenticated users.
--
-- ZAR pricing, PayFast only (SA market) — see IMPLEMENTATION.md Phase 4.

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id                  UUID        NOT NULL UNIQUE REFERENCES public.families(id) ON DELETE CASCADE,
  tier                       TEXT        NOT NULL DEFAULT 'free'
                                         CHECK (tier = ANY(ARRAY['free','plus','family'])),
  status                     TEXT        NOT NULL DEFAULT 'active'
                                         CHECK (status = ANY(ARRAY['active','cancelled','past_due','trialing'])),
  payfast_subscription_token TEXT,
  payfast_payment_id         TEXT,
  next_billing_date          DATE,
  trial_ends_at              TIMESTAMPTZ,
  cancelled_at               TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_family ON public.subscriptions(family_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_token  ON public.subscriptions(payfast_subscription_token)
  WHERE payfast_subscription_token IS NOT NULL;

-- Keep updated_at current on every write.
CREATE OR REPLACE FUNCTION public.touch_subscriptions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_subscriptions_updated_at();

-- RLS: read-only for family members. Writes are service-role only, so that a
-- client cannot grant itself a paid tier.
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Family members can view their subscription" ON public.subscriptions;
CREATE POLICY "Family members can view their subscription"
  ON public.subscriptions FOR SELECT
  USING (family_id = public.get_my_family_id());

-- Give every new family a free-tier row automatically, so application code can
-- assume the row exists.
CREATE OR REPLACE FUNCTION public.create_default_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (family_id, tier, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (family_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_families_default_subscription ON public.families;
CREATE TRIGGER trg_families_default_subscription
  AFTER INSERT ON public.families
  FOR EACH ROW EXECUTE FUNCTION public.create_default_subscription();
