-- ============================================================================
-- HOTFIX_RLS_500.sql - FIX ERROR 500 SAAT QUERY USER_PROFILES
-- ============================================================================
-- Jalankan ini SEGERA di Supabase Dashboard → SQL Editor
-- ============================================================================

-- 1. Hapus semua RLS policy lama yang bermasalah
DROP POLICY IF EXISTS "Admin full access" ON user_profiles;
DROP POLICY IF EXISTS "admin_full_access" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_view_own" ON user_profiles;
DROP POLICY IF EXISTS "user_update_own" ON user_profiles;
DROP POLICY IF EXISTS "service_role_bypass" ON user_profiles;
DROP POLICY IF EXISTS "authenticated_select_all" ON user_profiles;
DROP POLICY IF EXISTS "service_role_all" ON user_profiles;
DROP POLICY IF EXISTS "authenticated_insert" ON user_profiles;

-- 2. Pastikan RLS aktif
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Buat policy SEDERHANA tanpa self-reference (penyebab error 500)
-- SELECT: Semua authenticated user bisa lihat semua profiles
CREATE POLICY "authenticated_select_all" ON user_profiles
FOR SELECT TO authenticated
USING (true);

-- UPDATE: User hanya bisa update profile sendiri
CREATE POLICY "user_update_own" ON user_profiles
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- INSERT: Untuk signup flow
CREATE POLICY "authenticated_insert" ON user_profiles
FOR INSERT TO authenticated
WITH CHECK (true);

-- SERVICE ROLE: Bypass untuk backend
CREATE POLICY "service_role_all" ON user_profiles
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- 4. Reload schema
NOTIFY pgrst, 'reload schema';

-- 5. Verifikasi
SELECT '✅ HOTFIX SELESAI! Silakan refresh browser dan login ulang.' as status;

-- Cek policies yang aktif
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'user_profiles';
