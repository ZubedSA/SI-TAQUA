-- ========================================
-- DIAGNOSTIC: Cek Status Sistem Username
-- ========================================

-- 1. Cek apakah kolom username ada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND column_name = 'username';
-- Kalau KOSONG = kolom belum ada, harus jalankan MIGRATE_TO_USERNAME.sql

-- 2. Cek apakah function get_email_by_username ada
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'get_email_by_username';
-- Kalau KOSONG = function belum ada, harus jalankan MIGRATE_TO_USERNAME.sql

-- 3. Lihat semua user dan username mereka
SELECT 
    email, 
    username,
    CASE 
        WHEN username IS NULL THEN '❌ KOSONG - HARUS DIISI'
        WHEN username = '' THEN '❌ KOSONG - HARUS DIISI'
        ELSE '✅ OK'
    END as status_username
FROM user_profiles 
ORDER BY created_at DESC;

-- 4. Hitung berapa user yang username-nya masih kosong
SELECT 
    COUNT(*) as total_user_tanpa_username
FROM user_profiles 
WHERE username IS NULL OR username = '';
