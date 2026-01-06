-- ==========================================
-- FIX_INTERNAL_ROLE_PERMS.sql
-- ==========================================
-- Tujuannya memperbaiki permission role internal "supabase_auth_admin"
-- TAPI TANPA menggunakan "ALTER ROLE" yang menyebabkan error permission.
-- Kita hanya menggunakan GRANT.

BEGIN;

DO $$ 
BEGIN
  -- 1. Cek apakah role supabase_auth_admin ada
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    RAISE NOTICE 'Fixing permissions for supabase_auth_admin...';
    
    -- Grant Usage pada schema penting
    GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
    GRANT USAGE ON SCHEMA extensions TO supabase_auth_admin;
    GRANT USAGE ON SCHEMA auth TO supabase_auth_admin;
    
    -- Grant akses tabel AUTH (Penting!)
    GRANT ALL ON ALL TABLES IN SCHEMA auth TO supabase_auth_admin;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_admin;
    
    -- Grant execute pgcrypto (Sangat penting untuk login!)
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO supabase_auth_admin;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO supabase_auth_admin;
    
    -- Pastikan search_path level session aman (Sebisa mungkin)
    -- Kita tidak bisa set permanen (ALTER ROLE restricted), 
    -- tapi biasanya GoTrue set search_path sendiri atau pakai qualified names.
    -- Yang penting permission ada.
    
    RAISE NOTICE '✅ Permission supabase_auth_admin FIXED';
  ELSE
    RAISE NOTICE '⚠️ Role supabase_auth_admin tidak ditemukan (Mungkin environment lokal/self-hosted beda)';
  END IF;

  -- 2. Cek dashboard_user (kadang dipakai di dashboard Supabase)
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'dashboard_user') THEN
     GRANT ALL ON ALL TABLES IN SCHEMA auth TO dashboard_user;
     GRANT USAGE ON SCHEMA auth TO dashboard_user;
  END IF;

  -- 3. Jaga-jaga user postgres biasa
  GRANT USAGE ON SCHEMA auth TO postgres;
  GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres;
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO postgres;

END $$;

COMMIT;

-- Verifikasi pgcrypto lagi
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
-- Pastikan public juga punya akses (backup plan)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO public;

SELECT '✅ INTERNAL PERMS FIX APPLIED.' as status;
