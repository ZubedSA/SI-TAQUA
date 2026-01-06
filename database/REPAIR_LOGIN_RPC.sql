-- =======================================================
-- REPAIR_LOGIN_RPC.sql
-- Memperbaiki fungsi login username yang mungkin rusak/hilang
-- =======================================================

BEGIN;

-- 1. Drop fungsi lama biar bersih
DROP FUNCTION IF EXISTS public.get_email_by_username(TEXT);
DROP FUNCTION IF EXISTS public.dapatkan_email_dari_username(TEXT); -- Nama alias jika ada

-- 2. Buat Ulang Fungsi (Versi Paling Stabil)
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER -- Penting! Biar jalan dengan hak akses admin (bypass RLS)
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_email TEXT;
BEGIN
    -- Bersihkan input
    p_username := TRIM(p_username);

    -- Coba cari di user_profiles dulu (lebih cepat)
    SELECT email INTO v_email 
    FROM public.user_profiles 
    WHERE LOWER(username) = LOWER(p_username) 
    LIMIT 1;

    -- Jika tidak ketemu, cari di auth.users (metadata)
    IF v_email IS NULL THEN
        SELECT email INTO v_email 
        FROM auth.users 
        WHERE LOWER(raw_user_meta_data->>'username') = LOWER(p_username) 
        LIMIT 1;
    END IF;

    -- Jika masih null, return null (biar frontend tau)
    RETURN v_email;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL; -- Fail safe
END;
$$;

-- 3. JAMINAN AKSES (PENTING!)
-- Fungsi ini harus bisa dipanggil oleh 'anon' (user belum login)
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO postgres, authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO public; -- Double cover

-- 4. Test Function
SELECT public.get_email_by_username('admin') as test_result;

COMMIT;

SELECT '✅ RPC Login telah diperbaiki. Izin akses dibuka untuk publik.' as status;
