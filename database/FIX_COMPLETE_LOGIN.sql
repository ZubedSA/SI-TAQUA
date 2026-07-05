-- ==========================================
-- FIX_COMPLETE_LOGIN.sql
-- ==========================================
-- Fixes "Database error querying schema" during login
-- Ensures permissions for anon/authenticated users

-- 1. Grant USAGE on schemas
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO postgres, service_role; -- restricted, but ensure service_role has access

-- 2. Ensure pgcrypto is available and accessible
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
GRANT EXECUTE ON FUNCTION extensions.crypt(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION extensions.gen_salt(text) TO anon, authenticated, service_role;

-- 3. Fix user_profiles permissions
-- Allow anon/authenticated to select from user_profiles (for username lookup)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_profiles;
CREATE POLICY "Enable read access for all users"
ON public.user_profiles FOR SELECT
TO anon, authenticated
USING (true);

GRANT SELECT ON public.user_profiles TO anon, authenticated;

-- 4. Re-create get_email_by_username with explicit search_path
-- This ensures it finds tables even if search_path is restricted
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
    v_email TEXT;
BEGIN
    -- Check user_profiles first
    SELECT email INTO v_email
    FROM public.user_profiles
    WHERE LOWER(username) = LOWER(p_username)
    LIMIT 1;

    -- If not found, check auth.users metadata as fallback
    IF v_email IS NULL THEN
        SELECT email INTO v_email
        FROM auth.users
        WHERE LOWER(raw_user_meta_data->>'username') = LOWER(p_username)
        LIMIT 1;
    END IF;

    RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon, authenticated, service_role;

-- 5. Notify to reload schema cache
NOTIFY pgrst, 'reload schema';
