-- =========================================================================
-- FORCE_POPULATE_PROFILES.sql
-- Memaksa sinkronisasi data dari Auth.Users ke User_Profiles
-- =========================================================================

BEGIN;

-- 1. Info Awal
DO $$
DECLARE
    v_total_auth int;
    v_total_profiles int;
BEGIN
    SELECT count(*) INTO v_total_auth FROM auth.users;
    SELECT count(*) INTO v_total_profiles FROM public.user_profiles;
    RAISE NOTICE 'Sebelum Sync -> Auth: %, Profil: %', v_total_auth, v_total_profiles;
END $$;

-- 2. INSERT OR IGNORE (SINKRONISASI MASAL)
-- Mengambil semua user dari sistem login (auth.users) dan memasukkannya ke tabel profil
INSERT INTO public.user_profiles (user_id, email, nama, role, active_role, roles, created_at)
SELECT 
    id, 
    email, 
    -- Ambil nama dari metadata, atau pakai bagian depan email jika kosong
    COALESCE(raw_user_meta_data->>'nama', raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
    -- Ambil role dari metadata, atau default guest
    COALESCE(raw_user_meta_data->>'role', 'guest'),
    COALESCE(raw_user_meta_data->>'active_role', raw_user_meta_data->>'role', 'guest'),
    -- Pastikan roles array valid
    CASE 
        WHEN raw_user_meta_data->'roles' IS NOT NULL AND jsonb_typeof(raw_user_meta_data->'roles') = 'array' 
        THEN ARRAY(SELECT jsonb_array_elements_text(raw_user_meta_data->'roles'))
        ELSE ARRAY[COALESCE(raw_user_meta_data->>'role', 'guest')]::text[]
    END,
    created_at
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 3. Info Akhir
DO $$
DECLARE
    v_total_profiles_after int;
BEGIN
    SELECT count(*) INTO v_total_profiles_after FROM public.user_profiles;
    RAISE NOTICE 'Setelah Sync -> Total Profil: %', v_total_profiles_after;
END $$;

COMMIT;

SELECT '✅ DATA USER BERHASIL DISINKRONISASI. Silakan refresh halamannya.' as status;
