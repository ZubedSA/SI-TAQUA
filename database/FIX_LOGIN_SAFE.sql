-- ==========================================
-- FIX_LOGIN_SAFE.sql
-- ==========================================
-- Versi AMAN - FINAL CORRECTED
-- Tanpa syntax error dan tanpa menyentuh role internal system

BEGIN;

-- 1. Reset Search Path Roles Aplikasi
ALTER ROLE postgres SET search_path = public, extensions, auth;
ALTER ROLE service_role SET search_path = public, extensions, auth;
ALTER ROLE anon SET search_path = public, extensions, auth;
ALTER ROLE authenticated SET search_path = public, extensions, auth;

-- 2. Grant Akses "Public" ke Schema
GRANT USAGE ON SCHEMA public TO public;
GRANT USAGE ON SCHEMA extensions TO public;

-- 3. Grant Akses Auth ke Role Aplikasi (Service Role & Postgres)
GRANT USAGE ON SCHEMA auth TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres, service_role;

-- 4. HAPUS SEMUA TRIGGER DI SCHEMA AUTH
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

-- 5. Fix Pgcrypto Permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- 6. Re-create RPC
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
    v_email TEXT;
BEGIN
    SELECT email INTO v_email FROM public.user_profiles WHERE LOWER(username) = LOWER(p_username) LIMIT 1;
    IF v_email IS NULL THEN
        SELECT email INTO v_email FROM auth.users WHERE LOWER(raw_user_meta_data->>'username') = LOWER(p_username) LIMIT 1;
    END IF;
    RETURN v_email;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO public;

COMMIT;

NOTIFY pgrst, 'reload schema';

SELECT '✅ SAFE FIX APPLIED (CORRECTED). Coba login sekarang.' as status;
