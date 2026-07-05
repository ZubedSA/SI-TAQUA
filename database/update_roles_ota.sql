-- =====================================================
-- MIGRATION: Add 'ota' Role
-- Description: Updates constraints to allow 'ota' (Orang Tua Asuh) role
-- =====================================================

-- 1. Drop existing check constraint
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- 2. Add updated constraint including 'ota' and 'pengurus' (ensure all are present)
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('admin', 'guru', 'wali', 'bendahara', 'pengasuh', 'pengurus', 'ota'));

-- 3. Update RLS policies for user_profiles to allow 'ota' to read their own profile
-- (Assuming standard RLS exists: "Users can read own profile")

DO $$
BEGIN
    RAISE NOTICE 'Role constraint updated: Added ota';
END $$;
