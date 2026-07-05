-- ==========================================
-- FIX_SEARCH_PATH_AND_GRANTS.sql
-- ==========================================
-- Fixes "Database error querying schema" by correcting default search_paths
-- and ensuring explicit schema permissions.

BEGIN;

-- 1. Set SAFE Search Paths for Roles
-- This ensures 'auth' and 'extensions' are always visible without explicit qualification
ALTER ROLE authenticated SET search_path = public, extensions, auth;
ALTER ROLE anon SET search_path = public, extensions, auth;
ALTER ROLE service_role SET search_path = public, extensions, auth;
ALTER ROLE postgres SET search_path = public, extensions, auth;

-- 2. Grant Explicit USAGE on Critical Schemas
-- 'auth' schema is usually restricted, but ensure postgres/service_role have access
GRANT USAGE ON SCHEMA auth TO postgres, service_role;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 3. Grant Access to Auth Tables (for service_role/postgres)
-- Sometimes lost during migrations/resets
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO postgres, service_role;

-- 4. Re-grant Public Schema Access
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- 5. Fix pgcrypto permissions again just in case
GRANT EXECUTE ON FUNCTION extensions.crypt(text, text) TO anon, authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION extensions.gen_salt(text) TO anon, authenticated, service_role, postgres;

COMMIT;

-- 6. Verify Settings
SELECT 
    rolname, 
    rolconfig 
FROM pg_roles 
WHERE rolname IN ('authenticated', 'anon', 'service_role', 'postgres');

SELECT '✅ Search Path & Grants updated successfully.' as status;
