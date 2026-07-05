-- ==========================================
-- FIX_ALL_PROFILES_AND_ROLES.sql
-- ==========================================
-- Script ini memperbaiki user "lama" yang mungkin:
-- 1. Tidak punya profil (sehingga dashboard blank).
-- 2. Punya profil tapi role-nya salah/kosong.

BEGIN;

-- 1. BACKFILL PROFIL YANG HILANG
-- Masukkan semua user dari auth.users yang BELUM ada di user_profiles
INSERT INTO public.user_profiles (
    user_id,
    email,
    username,
    nama,
    role,
    roles,
    active_role,
    created_at,
    updated_at
)
SELECT 
    au.id,
    au.email,
    -- Coba ambil username dari metadata, kalau gak ada ambil dari email
    COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1)),
    -- Coba ambil nama dari metadata
    COALESCE(au.raw_user_meta_data->>'nama', split_part(au.email, '@', 1)),
    -- Default role (sementara santri, nanti di-fix di step 2)
    COALESCE(au.raw_user_meta_data->>'role', 'santri'),
    ARRAY[COALESCE(au.raw_user_meta_data->>'role', 'santri')],
    COALESCE(au.raw_user_meta_data->>'role', 'santri'),
    NOW(),
    NOW()
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL;

-- 2. FIX ROLE ADMIN
-- Pastikan user yang email/username-nya mengandung 'admin' jadi ADMIN sungguhan
UPDATE public.user_profiles
SET 
    role = 'admin',
    roles = array_append(roles, 'admin'),
    active_role = 'admin'
WHERE 
    (email ILIKE '%admin%' OR username ILIKE '%admin%')
    AND 'admin' != ALL(roles); -- Hanya update jika belum admin

-- 3. KHUSUS: Pastikan array roles minimal punya 1 isi
UPDATE public.user_profiles
SET roles = ARRAY[role]
WHERE roles IS NULL OR array_length(roles, 1) IS NULL;

COMMIT;

SELECT '✅ Fix User Lama Selesai. Semua user sekarang punya profil.' as status;
