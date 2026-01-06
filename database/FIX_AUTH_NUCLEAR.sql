-- ==========================================
-- FIX_AUTH_NUCLEAR.sql
-- ==========================================
-- SOLUSI FINAL UNTUK ERROR "Database error querying schema"
-- Script ini akan melakukan reset permission secara "brute force"
-- ke semua role yang mungkin digunakan oleh Supabase Auth (GoTrue).

BEGIN;

-- 1. Reset Search Path untuk Role Utama
-- Memastikan public, extensions, dan auth selalu bisa "dilihat"
ALTER ROLE postgres SET search_path = public, extensions, auth;
ALTER ROLE service_role SET search_path = public, extensions, auth;
ALTER ROLE anon SET search_path = public, extensions, auth;
ALTER ROLE authenticated SET search_path = public, extensions, auth;

-- 2. Handle Role Internal Supabase (supabase_auth_admin)
-- Ini seringkali menjadi penyebab utama error di environment Cloud/Docker
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    RAISE NOTICE 'Fixing supabase_auth_admin role...';
    ALTER ROLE supabase_auth_admin SET search_path = public, extensions, auth;
    
    -- Berikan akses penuh ke schema internal
    GRANT USAGE, CREATE ON SCHEMA auth TO supabase_auth_admin;
    GRANT ALL ON ALL TABLES IN SCHEMA auth TO supabase_auth_admin;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_admin;
    
    GRANT USAGE ON SCHEMA extensions TO supabase_auth_admin;
    GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
  END IF;
  
  -- Handle role dashboard_user (kadang ada di local setup)
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'dashboard_user') THEN
    GRANT ALL ON ALL TABLES IN SCHEMA auth TO dashboard_user;
    ALTER ROLE dashboard_user SET search_path = public, extensions, auth;
  END IF;
END
$$;

-- 3. Grant Akses "Public" ke Schema
-- Membuka pintu gerbang schema agar bisa dilewati
GRANT USAGE ON SCHEMA public TO public;
GRANT USAGE ON SCHEMA extensions TO public;
-- Note: Jangan grant usage auth ke public secara global, cukup role diatas

-- 4. Pastikan Ekstensi pgcrypto ada di tempat yang benar
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO public;

-- 5. HAPUS SEMUA TRIGGER DI SCHEMA AUTH (LAGI)
-- Membersihkan sisa-sisa trigger bandel
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE event_object_schema = 'auth' 
    ) 
    LOOP 
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON auth.' || quote_ident(r.event_object_table) || ' CASCADE;'; 
        RAISE NOTICE 'Removed trigger: %', r.trigger_name;
    END LOOP; 
END $$;

COMMIT;

-- 6. Reload Config
NOTIFY pgrst, 'reload schema';

SELECT '✅ NUCLEAR FIX APPLIED. Coba login sekarang.' as status;
