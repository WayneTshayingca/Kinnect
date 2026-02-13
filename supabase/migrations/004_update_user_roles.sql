-- Update the CHECK constraint on users.role to use new role labels
-- Old values: 'parent', 'grandparent', 'child', 'domestic_worker'
-- New values: 'admin', 'member', 'dependent', 'observer'

-- 1. Drop the old constraint FIRST (before updating rows)
DO $$
BEGIN
  EXECUTE (
    SELECT 'ALTER TABLE users DROP CONSTRAINT ' || quote_ident(conname)
    FROM pg_constraint
    WHERE conrelid = 'users'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%role%'
    LIMIT 1
  );
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 2. Update any existing rows with old role values
UPDATE users SET role = 'admin' WHERE role = 'parent';
UPDATE users SET role = 'member' WHERE role IN ('grandparent', 'domestic_worker');
UPDATE users SET role = 'dependent' WHERE role = 'child';

-- 3. Add the new constraint with updated role values
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'member', 'dependent', 'observer'));
