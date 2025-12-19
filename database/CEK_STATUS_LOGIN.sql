-- Query sederhana untuk CEK STATUS sistem username
-- Jalankan ini di Supabase SQL Editor untuk lihat apa masalahnya

-- 1. Cek apakah RPC function sudah ada
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc WHERE proname = 'get_email_by_username'
        ) THEN '✅ Function get_email_by_username SUDAH ADA'
        ELSE '❌ Function get_email_by_username BELUM ADA - HARUS JALANKAN FIX_COMPLETE_USERNAME_SYSTEM.sql'
    END as status_function;

-- 2. Cek semua username
SELECT 
    email,
    username,
    CASE 
        WHEN username IS NULL THEN '❌ NULL - HARUS DIPERBAIKI'
        WHEN username = '' THEN '❌ KOSONG - HARUS DIPERBAIKI'
        ELSE '✅ OK - Bisa Login dengan: ' || username
    END as status
FROM user_profiles
ORDER BY created_at DESC;

-- 3. Test function (ganti 'USERNAMEKAMU' dengan username yang mau dicoba)
-- SELECT get_email_by_username('USERNAMEKAMU');
