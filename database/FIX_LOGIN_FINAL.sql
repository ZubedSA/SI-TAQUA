-- ==========================================
-- FIX_LOGIN_FINAL.sql
-- ==========================================
-- Aggressive fix for "Database error querying schema"
-- 1. Drops ALL triggers on auth.users (prevents side-effects during login)
-- 2. Grants broad permissions to schemas

BEGIN;

-- 1. DROP ALL TRIGGERS ON auth.users
-- This handles the common case where a broken trigger fails the login transaction
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

-- 2. Drop specific functions that might be attached to triggers (just in case)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.on_auth_user_created() CASCADE;

-- 3. PERMISSIONS - BROAD ACCESS (Fixes schema usage errors)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- 4. ENSURE USER_PROFILES IS ACCESSIBLE
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_view_access" ON public.user_profiles;
CREATE POLICY "public_view_access" ON public.user_profiles
FOR SELECT TO public -- "public" role includes anon & authenticated
USING (true);

-- 5. RPC FIX
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

SELECT '✅ FIX_LOGIN_FINAL completed. Triggers dropped & Permissions reset.' as status;
