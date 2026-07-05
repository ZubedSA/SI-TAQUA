-- =========================================================================
-- RESTORE_USERNAME_LOGIN.sql
-- Membuat ulang function get_email_by_username agar login username berfungsi
-- =========================================================================

-- 1. Buat function untuk convert username ke email
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_email TEXT;
BEGIN
    -- Cari di user_profiles
    SELECT email INTO v_email 
    FROM public.user_profiles 
    WHERE LOWER(username) = LOWER(TRIM(p_username)) 
    LIMIT 1;

    -- Jika tidak ketemu, coba cari di auth.users metadata
    IF v_email IS NULL THEN
        SELECT email INTO v_email 
        FROM auth.users 
        WHERE LOWER(raw_user_meta_data->>'username') = LOWER(TRIM(p_username))
        LIMIT 1;
    END IF;

    RETURN v_email;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- 2. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO service_role;

-- 3. Reload config
NOTIFY pgrst, 'reload config';

SELECT 'Function get_email_by_username sudah dibuat. Coba login lagi.' as status;
