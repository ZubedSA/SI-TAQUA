-- =========================================================================
-- NUCLEAR_CLEANUP.sql
-- HAPUS SEMUA yang saya buat, kembalikan ke kondisi bersih
-- =========================================================================

-- 1. HAPUS SEMUA TRIGGER yang saya buat
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trg_prevent_role_change ON public.user_profiles;
DROP TRIGGER IF EXISTS trg_protect_role_change ON public.user_profiles;
DROP TRIGGER IF EXISTS trg_initialize_role_data ON public.user_profiles;

-- 2. HAPUS SEMUA FUNCTION yang saya buat/modifikasi
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.prevent_role_change_by_user() CASCADE;
DROP FUNCTION IF EXISTS public.get_email_by_username(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.check_login_restriction(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.log_login_activity(TEXT, TEXT, TEXT) CASCADE;

-- 3. MATIKAN RLS TOTAL
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 4. HAPUS SEMUA POLICY
DROP POLICY IF EXISTS "Safe Read Policy" ON public.user_profiles;
DROP POLICY IF EXISTS "Self Update Policy" ON public.user_profiles;
DROP POLICY IF EXISTS "Authenticated Select" ON public.user_profiles;
DROP POLICY IF EXISTS "Self Modify" ON public.user_profiles;
DROP POLICY IF EXISTS "Public select" ON public.user_profiles;

-- 5. GRANT ULANG PERMISSIONS DASAR
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;
GRANT SELECT ON public.user_profiles TO anon;

-- 6. RELOAD CONFIG
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

-- 7. Tunggu sebentar (simulasi)
SELECT pg_sleep(1);

SELECT 'CLEANUP SELESAI. Semua function/trigger dihapus. Refresh browser.' as status;
