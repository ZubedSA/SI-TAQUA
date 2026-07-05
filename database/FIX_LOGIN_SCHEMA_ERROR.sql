-- =========================================================================
-- FIX_LOGIN_SCHEMA_ERROR.sql
-- Memperbaiki "Database error querying schema"
-- =========================================================================

BEGIN;

-- 1. Refresh Cache Supabase/PostgREST
-- Ini seringkali mengatasi error "Schema" yang aneh setelah perubahan database
NOTIFY pgrst, 'reload config';

-- 2. Pastikan RPC Login Benar-Benar Aman (Tanpa Dependensi Aneh)
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_email TEXT;
BEGIN
    -- Coba cari di auth.users langsung (Source of Truth) via Metadata
    -- Ini lebih aman daripada query ke user_profiles jika user_profiles bermasalah
    SELECT email INTO v_email 
    FROM auth.users 
    WHERE LOWER(raw_user_meta_data->>'username') = LOWER(TRIM(p_username))
    LIMIT 1;

    -- Jika tidak ketemu di metadata, baru cek user_profiles (Legacy support)
    IF v_email IS NULL THEN
        SELECT email INTO v_email 
        FROM public.user_profiles 
        WHERE LOWER(username) = LOWER(TRIM(p_username)) 
        LIMIT 1;
    END IF;

    RETURN v_email;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO service_role;

-- 3. Cleanup Policy RLS (Pastikan tidak ada loop)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated Select" ON public.user_profiles;
DROP POLICY IF EXISTS "Safe Read Policy" ON public.user_profiles;
DROP POLICY IF EXISTS "Public select" ON public.user_profiles;

-- Policy Paling Sederhana: Authenticated Boleh Baca Semua
-- Menghemat resources DB dan mencegah error recursion
CREATE POLICY "Authenticated Select"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (true);

-- Policy Insert/Update Diri Sendiri
CREATE POLICY "Self Modify"
ON public.user_profiles
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

COMMIT;

SELECT '✅ CONFIG RELOADED & LOGIN FUNCS FIXED. Refresh browser sekarang.' as status;
