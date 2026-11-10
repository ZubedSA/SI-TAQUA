-- ============================================================================
-- ENABLE_DEV_ACCESS.sql
-- Aktifkan Akses Penuh Data untuk Database Pengembangan (Dev)
-- Jalankan di SQL Editor Supabase Dev (SI-TAQUA-TES)
-- ============================================================================

-- 1. Matikan RLS di semua tabel public dan berikan akses ke authenticated & anon
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' DISABLE ROW LEVEL SECURITY;';
        EXECUTE 'GRANT ALL ON TABLE public.' || quote_ident(r.tablename) || ' TO anon, authenticated, service_role;';
    END LOOP;
END $$;

-- 2. Berikan akses ke sequence (auto-increment id)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 3. Pasang RPC get_email_by_username agar bisa login dengan username 'ptqa'
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
    v_email TEXT;
BEGIN
    -- 1. Cari di user_profiles
    SELECT email INTO v_email
    FROM public.user_profiles
    WHERE LOWER(username) = LOWER(TRIM(p_username))
    LIMIT 1;

    -- 2. Jika tidak ada, cari di auth.users metadata
    IF v_email IS NULL THEN
        SELECT email INTO v_email
        FROM auth.users
        WHERE LOWER(raw_user_meta_data->>'username') = LOWER(TRIM(p_username))
        LIMIT 1;
    END IF;

    RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon, authenticated, service_role;

-- 4. Reload cache Supabase PostgREST
NOTIFY pgrst, 'reload schema';

