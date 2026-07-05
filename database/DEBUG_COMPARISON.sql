-- ==========================================
-- DEBUG_COMPARISON.sql
-- ==========================================
-- Bandingkan user yang gagal access dengan user lain

-- 1. List Instance IDs summary
SELECT instance_id, count(*) FROM auth.users GROUP BY instance_id;

-- 2. Dump 2 user terbaru (User baru yg gagal)
SELECT 
    id, 
    email, 
    instance_id, 
    role, 
    aud, 
    confirmed_at, 
    CASE WHEN encrypted_password IS NOT NULL THEN 'HAS_PASSWORD' ELSE 'NO_PASSWORD' END as pw_status
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 2;

-- 3. Dump 1 user lama (yang mungkin berhasil login, jika ada)
SELECT 
    id, 
    email, 
    instance_id, 
    role, 
    aud, 
    confirmed_at,
    CASE WHEN encrypted_password IS NOT NULL THEN 'HAS_PASSWORD' ELSE 'NO_PASSWORD' END as pw_status
FROM auth.users 
ORDER BY created_at ASC 
LIMIT 1;

-- 4. Cek Extension Pgsodium (Kadang create issue di Supabase)
SELECT extname, extversion FROM pg_extension WHERE extname = 'pgsodium';

