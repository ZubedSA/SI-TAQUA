-- ==========================================
-- FIX_LOGIN_EMERGENCY.sql
-- ==========================================
-- "LAST RESORT" FIX
-- Memastikan pgcrypto ada di public, dan permission dibuka selebar-lebarnya
-- untuk memastikan tidak ada blocking permission.

BEGIN;

-- 1. Install pgcrypto di PUBLIC (Fallback jika 'extensions' schema tidak terbaca)
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO public;

-- 2. Buka Akses Schema PUBLIC ke semua orang
GRANT USAGE, CREATE ON SCHEMA public TO public;
GRANT ALL ON ALL TABLES IN SCHEMA public TO public;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO public;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO public;

-- 3. Buka Akses Schema EXTENSIONS
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO public;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO public;

-- 4. Buka Akses Schema AUTH (READ ONLY untuk aplikasi, FULL untuk Service/Postgres)
GRANT USAGE ON SCHEMA auth TO anon, authenticated, postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO postgres, service_role;
-- Hati-hati memberi select auth ke anon/authenticated, tapi untuk debugging:
GRANT SELECT ON auth.users TO postgres, service_role;

-- 5. HAPUS SEMUA TRIGGER DI SCHEMA AUTH user
-- Karena kita tidak bisa drop semua trigger schema auth (permission restricted),
-- minimal kita drop yang di users
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_schema = 'auth' 
        AND event_object_table = 'users' 
    ) 
    LOOP 
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON auth.users CASCADE;'; 
        RAISE NOTICE 'Dropped trigger: %', r.trigger_name;
    END LOOP; 
END $$;

-- 6. SET Search Path Default (Public First)
ALTER DATABASE postgres SET search_path TO public, extensions, auth;
-- Jika command diatas gagal (karena nama db beda), kita set level role
ALTER ROLE postgres SET search_path = public, extensions, auth;
ALTER ROLE service_role SET search_path = public, extensions, auth;
ALTER ROLE anon SET search_path = public, extensions, auth;
ALTER ROLE authenticated SET search_path = public, extensions, auth;

COMMIT;

NOTIFY pgrst, 'reload schema';

SELECT '✅ EMERGENCY FIX APPLIED. Pgcrypto in Public. Permissions Wide Open.' as status;
