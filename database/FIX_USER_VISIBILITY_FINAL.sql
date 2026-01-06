-- =========================================================================
-- FIX_USER_VISIBILITY_FINAL.sql
-- Mematikan RLS agar semua user bisa terlihat di web
-- =========================================================================

-- 1. Matikan RLS total
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 2. Hapus semua policy yang mungkin mengganggu
DROP POLICY IF EXISTS "user_update_own" ON public.user_profiles;
DROP POLICY IF EXISTS "Safe Read Policy" ON public.user_profiles;
DROP POLICY IF EXISTS "Self Update Policy" ON public.user_profiles;
DROP POLICY IF EXISTS "Authenticated Select" ON public.user_profiles;
DROP POLICY IF EXISTS "Self Modify" ON public.user_profiles;
DROP POLICY IF EXISTS "Public select" ON public.user_profiles;

-- 3. Grant full access
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO anon;
GRANT ALL ON public.user_profiles TO service_role;

-- 4. Reload
NOTIFY pgrst, 'reload config';

SELECT 'RLS dimatikan. Refresh browser sekarang.' as status;
