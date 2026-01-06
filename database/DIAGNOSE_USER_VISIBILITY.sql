-- =========================================================================
-- DIAGNOSE_USER_VISIBILITY.sql
-- Cek kenapa data user tidak tampil di web
-- =========================================================================

-- 1. Cek status RLS
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_profiles';

-- 2. Cek jumlah data
SELECT 
    (SELECT count(*) FROM auth.users) as auth_users_count,
    (SELECT count(*) FROM public.user_profiles) as profiles_count;

-- 3. Cek policy yang aktif
SELECT 
    policyname, 
    tablename, 
    cmd,
    permissive,
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- 4. Lihat 5 user terakhir di profiles
SELECT user_id, email, nama, role, active_role, roles, created_at 
FROM public.user_profiles 
ORDER BY created_at DESC 
LIMIT 5;
