-- ==========================================
-- CHECK_RECENT_USERS.sql
-- ==========================================
-- Cek user yang baru dibuat dalam 15 menit terakhir
-- Untuk verifikasi apakah data sudah masuk meski frontend error.

SELECT 'AUTH.USERS' as table_name;
SELECT id, email, created_at, instance_id 
FROM auth.users 
WHERE created_at > NOW() - INTERVAL '15 minutes'
ORDER BY created_at DESC;

SELECT 'PUBLIC.USER_PROFILES' as table_name;
SELECT user_id, username, email, created_at 
FROM public.user_profiles
WHERE created_at > NOW() - INTERVAL '15 minutes'
ORDER BY created_at DESC;
