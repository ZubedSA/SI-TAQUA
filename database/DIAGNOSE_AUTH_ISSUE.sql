-- ==========================================
-- DIAGNOSE_AUTH_ISSUE.sql
-- ==========================================
-- Run this to gather info about the Auth system state

-- 1. Check Instance IDs
-- Supabase Auth filters by instance_id. If we inserted the wrong one, login fails.
SELECT 'Checking Instance IDs' as section;
SELECT DISTINCT instance_id FROM auth.users;

-- 2. Check the user in question (Latest created user)
SELECT 'Latest User Info' as section;
SELECT id, email, role, instance_id, created_at, last_sign_in_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 3;

-- 3. Check Permissions on auth.users for 'postgres' and 'service_role'
-- These roles must have SELECT access.
SELECT 'Permissions on auth.users' as section;
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'auth' AND table_name = 'users';

-- 4. Check Triggers on auth.users (Should be empty if FIX_LOGIN_FINAL ran)
SELECT 'Active Triggers on auth.users' as section;
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' AND event_object_table = 'users';

-- 5. Check Search Path
SELECT 'Current Search Path' as section;
SHOW search_path;

-- 6. Check Extensions
SELECT 'Installed Extensions' as section;
SELECT extname, extversion, extrelocatable 
FROM pg_extension 
WHERE extname IN ('pgcrypto', 'uuid-ossp');

-- 7. Test manual password verification (Simulation)
-- Requires pgcrypto
SELECT 'Password Verification Test' as section;
DO $$
DECLARE
    v_test_pass TEXT;
BEGIN
    -- Just checking if crypt function exists and works
    v_test_pass := extensions.crypt('test1234', extensions.gen_salt('bf'));
    RAISE NOTICE 'Crypto Check: Success. Hash generated.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Crypto Check: FAILED. %', SQLERRM;
END $$;
