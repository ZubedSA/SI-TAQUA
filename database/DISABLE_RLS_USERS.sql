-- =========================================================================
-- DISABLE_RLS_USERS.sql
-- Matikan RLS Sepenuhnya untuk memastikan masalahnya bukan di Permission
-- =========================================================================

BEGIN;

-- 1. Matikan RLS (Row Level Security)
-- Ini artinya siapa saja (yang punya koneksi ke DB/API) bisa baca tabel ini
-- SANGAT TIDAK DISARANKAN UNTUK PRODUCTION JANGKA PANJANG
-- Tapi ini satu-satunya cara untuk membuktikan 100% bahwa datanya muncul.
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 2. Pastikan Permission Grant sudah benar
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;
GRANT ALL ON public.user_profiles TO anon; -- (Optional: biar data tidak hilang saat logout/refresh)

-- 3. Cek Ulang Jumlah Data (Output Log)
DO $$
DECLARE
    v_count int;
BEGIN
    SELECT count(*) INTO v_count FROM public.user_profiles;
    RAISE NOTICE 'Jumlah User di Database (Saat ini): %', v_count;
END $$;

COMMIT;

SELECT '✅ RLS SUDAH DIMATIKAN TOTAL. COBA REFRESH HALAMAN WEB.' as status;
