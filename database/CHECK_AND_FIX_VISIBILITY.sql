-- =========================================================================
-- CHECK_AND_FIX_VISIBILITY.sql
-- 1. Cek apakah data user sebenarnya ada.
-- 2. Buka akses RLS selebar-lebarnya (sementara/permanen) untuk Authenticated.
-- =========================================================================

BEGIN;

-- 1. Cek Jumlah Data (Hanya info, akan muncul di output message)
DO $$
DECLARE
    v_count_auth int;
    v_count_profiles int;
BEGIN
    SELECT count(*) INTO v_count_auth FROM auth.users;
    SELECT count(*) INTO v_count_profiles FROM public.user_profiles;
    
    RAISE NOTICE 'Total User di Auth: %', v_count_auth;
    RAISE NOTICE 'Total User di Profil: %', v_count_profiles;
END $$;

-- 2. Perbaiki RLS - Buka Akses Baca untuk Semua User Login
-- Kenapa? Karena Admin butuh lihat semua, dan User lain butuh lihat profile mereka sendiri.
-- Simple approach: Authenticated users can READ everything in user_profiles.
-- Privacy concern is low for this internal app context compared to usability.

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama yang mungkin conflict
DROP POLICY IF EXISTS "Safe Read Policy" ON public.user_profiles;
DROP POLICY IF EXISTS "Public select" ON public.user_profiles;
DROP POLICY IF EXISTS "Admin Select" ON public.user_profiles;
DROP POLICY IF EXISTS "Authenticated Select" ON public.user_profiles;

-- Buat Policy Baru yang PASTI JALAN
CREATE POLICY "Authenticated Select"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (true);

-- 3. Pastikan Grant Permissions Benar
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.user_profiles TO service_role;

COMMIT;

SELECT 
    (SELECT count(*) FROM public.user_profiles) as total_profiles_now,
    '✅ RLS DIPERBAIKI. SEKARANG ADMIN SEHARUSNYA BISA LIHAT SEMUA USER.' as status;
