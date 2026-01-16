-- =====================================================
-- MIGRATION: Fix Role Check Constraint
-- Resolves "violates check constraint user_profiles_role_check"
-- =====================================================

-- 1. Drop the old restrictive constraint
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- 2. Add new constraint with ALL roles support
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('admin', 'guru', 'wali', 'bendahara', 'pengasuh'));

-- 3. Also update default just in case
ALTER TABLE user_profiles 
ALTER COLUMN role SET DEFAULT 'guru';

DO $$
BEGIN
    RAISE NOTICE 'Role constraint updated successfully to include all roles.';
END $$;
