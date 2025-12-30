-- =====================================================
-- FIX PERMISSIONS & SEARCH PATH (SOLUSI INFRASTRUKTUR)
-- =====================================================
-- Error "Database error querying schema" sering terjadi karena:
-- 1. User database kehilangan hak akses (Permissions).
-- 2. "Jalur" (Search Path) ke schema public putus.
-- 3. Cache Database Supabase macet.

-- 1. PERBAIKI SEARCH PATH
-- Pastikan setiap role tahu di mana mencari tabel
ALTER ROLE authenticated SET search_path = public, auth;
ALTER ROLE service_role SET search_path = public, auth;
ALTER ROLE postgres SET search_path = public, auth;

-- 2. GRANT PERMISSIONS (HAK AKSES PENUH)
-- Pastikan system role bisa membaca/menulis semua tabel
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;

-- Grant spesifik untuk user login (Authenticated)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 3. RELOAD CONFIG
SELECT pg_reload_conf();
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- ⚠️ PENTING: JIKA MASIH GAGAL SETELAH SCRIPT INI ⚠️
-- =====================================================
-- Masalah kemungkinan besar ada di "Cache Server Supabase" yang nyangkut, 
-- ATAU Data User Wali tersebut sudah korup (rusak) sejak awal.
--
-- SOLUSI FINAL (DILAKUKAN DI DASHBOARD SUPABASE):
-- 1. Buka Dashboard Supabase -> Authentication -> Users.
-- 2. HAPUS user Wali yang bermasalah (Delete).
-- 3. Buka Settings -> General -> RESTART PROJECT (Ini akan mereset cache server).
-- 4. Tunggu beberapa menit, lalu buat ulang user Wali.
-- =====================================================
