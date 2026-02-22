-- Migration: Multi-family support
-- Adds a family_members junction table so one user can belong to multiple
-- families. active_family_id on users drives which family is currently active
-- for RLS — all existing policies continue to work unchanged via get_my_family_id().
--
-- Production safety:
--   • Wrapped in a transaction — any failure rolls back the entire migration.
--   • Backfill is verified before get_my_family_id() is changed, so no user
--     loses data access due to a NULL active_family_id.
--   • create_family_with_user() uses CREATE OR REPLACE (atomic — old version
--     stays live until the new one is ready, no drop/recreate gap).
--   • Policy replacements happen inside the transaction, so no unprotected window.

BEGIN;

-- ── 1. Add active_family_id to users ─────────────────────────────

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS active_family_id UUID
    REFERENCES public.families(id) ON DELETE SET NULL;

-- ── 2. Create family_members junction table ───────────────────────

CREATE TABLE IF NOT EXISTS public.family_members (
                                                     family_id  UUID        NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
    role       TEXT        NOT NULL DEFAULT 'member',
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT family_members_pkey       PRIMARY KEY (family_id, user_id),
    CONSTRAINT family_members_role_check CHECK (
                                                   role = ANY(ARRAY['admin'::text, 'member'::text, 'dependent'::text, 'observer'::text])
    )
    );

CREATE INDEX IF NOT EXISTS idx_family_members_user   ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family ON public.family_members(family_id);

-- ── 3. Backfill existing single-family data ───────────────────────

INSERT INTO public.family_members (family_id, user_id, role)
SELECT family_id, id, COALESCE(role, 'member')
FROM   public.users
WHERE  family_id IS NOT NULL
    ON CONFLICT DO NOTHING;

UPDATE public.users
SET    active_family_id = family_id
WHERE  family_id IS NOT NULL
  AND    active_family_id IS NULL;

-- ── Safety check: abort if backfill is incomplete ─────────────────
-- Ensures no user with a family_id ends up with a NULL active_family_id,
-- which would lock them out of all their data after step 4.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.users
    WHERE family_id IS NOT NULL
    AND   active_family_id IS NULL
  ) THEN
    RAISE EXCEPTION
      'Backfill incomplete — some users have family_id but no active_family_id. Migration aborted.';
END IF;
END $$;

-- ── 4. Update get_my_family_id() to use active_family_id ─────────

CREATE OR REPLACE FUNCTION public.get_my_family_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT active_family_id
FROM   public.users
WHERE  auth_user_id = auth.uid()
    LIMIT  1;
$$;

-- ── 5. Replace users RLS policies to go through family_members ────
-- Inside a transaction, the drop+create is atomic — no unprotected window.

DROP POLICY IF EXISTS "Users can view family members"   ON public.users;
DROP POLICY IF EXISTS "Users can update family members" ON public.users;
DROP POLICY IF EXISTS "Users can delete family members" ON public.users;

CREATE POLICY "Users can view family members"
  ON public.users FOR SELECT
                                                USING (
                                                id IN (
                                                SELECT user_id FROM public.family_members
                                                WHERE  family_id = public.get_my_family_id()
                                                )
                                                );

CREATE POLICY "Users can update family members"
  ON public.users FOR UPDATE
                                 USING (
                                 id IN (
                                 SELECT user_id FROM public.family_members
                                 WHERE  family_id = public.get_my_family_id()
                                 )
                                 );

CREATE POLICY "Users can delete family members"
  ON public.users FOR DELETE
USING (
    id IN (
      SELECT user_id FROM public.family_members
      WHERE  family_id = public.get_my_family_id()
    )
  );

-- ── 6. RLS for family_members ─────────────────────────────────────

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members of their active family"
  ON public.family_members FOR SELECT
                                          USING (family_id = public.get_my_family_id());

CREATE POLICY "Users can add members to their active family"
  ON public.family_members FOR INSERT
  WITH CHECK (family_id = public.get_my_family_id());

CREATE POLICY "Users can update members of their active family"
  ON public.family_members FOR UPDATE
                                                 USING (family_id = public.get_my_family_id());

CREATE POLICY "Users can remove members from their active family"
  ON public.family_members FOR DELETE
USING (family_id = public.get_my_family_id());

-- ── 7. RPC: get all families for the current user ─────────────────

CREATE OR REPLACE FUNCTION public.get_my_families()
RETURNS TABLE (
  family_id   UUID,
  family_name TEXT,
  role        TEXT,
  is_active   BOOLEAN
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT
    f.id,
    f.name,
    fm.role,
    (f.id = u.active_family_id) AS is_active
FROM  public.family_members fm
          JOIN  public.families f ON f.id = fm.family_id
          JOIN  public.users    u ON u.id = fm.user_id
WHERE u.auth_user_id = auth.uid();
$$;

-- ── 8. RPC: switch the current user's active family ───────────────

CREATE OR REPLACE FUNCTION public.switch_active_family(target_family_id UUID)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
current_user_id UUID;
BEGIN
SELECT id INTO current_user_id
FROM   public.users
WHERE  auth_user_id = auth.uid();

IF NOT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE  user_id   = current_user_id
    AND    family_id = target_family_id
  ) THEN
    RAISE EXCEPTION 'User is not a member of this family';
END IF;

UPDATE public.users
SET    active_family_id = target_family_id
WHERE  id = current_user_id;
END;
$$;

-- ── 9. Update create_family_with_user() — CREATE OR REPLACE (atomic) ─
-- No DROP here: the old version stays live until this statement succeeds.

CREATE OR REPLACE FUNCTION public.create_family_with_user(
  family_name  TEXT,
  auth_uid     UUID,
  user_name    TEXT,
  primary_lang TEXT DEFAULT 'en'
)
RETURNS UUID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
new_family_id    UUID;
  existing_user_id UUID;
  is_first_family  BOOLEAN;
BEGIN
INSERT INTO public.families (name, primary_language)
VALUES (family_name, primary_lang)
    RETURNING id INTO new_family_id;

SELECT id INTO existing_user_id
FROM   public.users
WHERE  auth_user_id = auth_uid;

IF existing_user_id IS NOT NULL THEN
SELECT NOT EXISTS (
    SELECT 1 FROM public.family_members WHERE user_id = existing_user_id
) INTO is_first_family;

IF is_first_family THEN
      -- First family: set family_id (legacy), active_family_id, role
UPDATE public.users
SET    family_id        = new_family_id,
       active_family_id = new_family_id,
       name             = COALESCE(NULLIF(name, ''), user_name),
       role             = 'admin'
WHERE  id = existing_user_id;
ELSE
      -- Additional family: switch active family only, preserve primary family_id
UPDATE public.users
SET    active_family_id = new_family_id
WHERE  id = existing_user_id;
END IF;
ELSE
    INSERT INTO public.users (auth_user_id, family_id, active_family_id, name, role)
    VALUES (auth_uid, new_family_id, new_family_id, user_name, 'admin')
    RETURNING id INTO existing_user_id;
END IF;

INSERT INTO public.family_members (family_id, user_id, role)
VALUES (new_family_id, existing_user_id, 'admin')
    ON CONFLICT DO NOTHING;

RETURN new_family_id;
END;
$$;

-- ── 10. Enable realtime for family_members ────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.family_members;

COMMIT;
