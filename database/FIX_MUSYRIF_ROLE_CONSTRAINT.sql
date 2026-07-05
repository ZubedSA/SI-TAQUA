-- ============================================================================
-- FIX: Role Constraint untuk MUSYRIF
-- ============================================================================
-- Error: new row for relation "user_profiles" violates check constraint "user_profiles_role_check"
-- Solution: Update CHECK constraint untuk include 'musyrif'
-- ============================================================================
-- JALANKAN DI SUPABASE SQL EDITOR
-- ============================================================================

-- Drop constraint lama
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Recreate dengan musyrif
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('admin', 'guru', 'bendahara', 'pengasuh', 'wali', 'pengurus', 'ota', 'musyrif'));

SELECT '✅ Role constraint updated - musyrif sekarang diizinkan' as status;
