-- ==========================================
-- FIX_LEGACY_USERS_UPSERT.sql
-- ==========================================
-- SOLUSI PERMANEN UNTUK AKUN LAMA (BLANK SCREEN).
-- Melakukan "UPSERT" (Update/Insert) untuk memastikan semua user punya profil.

BEGIN;

-- 1. INSERT MANUAL UNTUK SEMUA USER YANG BELUM PUNYA PROFIL
-- Kita gunakan ON CONFLICT DO NOTHING agar aman jika sudah ada
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
    -- Username: ambil dari metadata atau potong email sebelum @
    COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1)),
    -- Nama: ambil dari metadata atau potong email
    COALESCE(au.raw_user_meta_data->>'nama', split_part(au.email, '@', 1)),
    -- Default role: admin jika email mengandung 'admin', lainnya 'santri'
    CASE 
        WHEN au.email ILIKE '%admin%' OR au.raw_user_meta_data->>'username' ILIKE '%admin%' THEN 'admin'
        WHEN au.email = 'achzubaidi07@gmail.com' OR au.email ILIKE 'achzubaidi07%' THEN 'admin' -- Hardcode admin ini
        ELSE 'santri'
    END,
    -- Roles array
    CASE 
        WHEN au.email ILIKE '%admin%' OR au.raw_user_meta_data->>'username' ILIKE '%admin%' THEN ARRAY['admin']
        WHEN au.email = 'achzubaidi07@gmail.com' OR au.email ILIKE 'achzubaidi07%' THEN ARRAY['admin']
        ELSE ARRAY['santri']
    END,
    -- Active role
    CASE 
        WHEN au.email ILIKE '%admin%' OR au.raw_user_meta_data->>'username' ILIKE '%admin%' THEN 'admin'
        WHEN au.email = 'achzubaidi07@gmail.com' OR au.email ILIKE 'achzubaidi07%' THEN 'admin'
        ELSE 'santri'
    END,
    NOW(),
    NOW()
FROM auth.users au
ON CONFLICT (user_id) DO UPDATE
SET 
    -- Jika sudah ada, kita perbaiki role-nya jika dia seharusya admin
    role = CASE 
        WHEN EXCLUDED.email ILIKE 'achzubaidi07%' THEN 'admin' 
        ELSE public.user_profiles.role 
    END,
    roles = CASE 
        WHEN EXCLUDED.email ILIKE 'achzubaidi07%' AND 'admin' != ANY(public.user_profiles.roles) 
        THEN array_append(public.user_profiles.roles, 'admin')
        ELSE public.user_profiles.roles
    END,
    active_role = CASE 
        WHEN EXCLUDED.email ILIKE 'achzubaidi07%' THEN 'admin'
        ELSE public.user_profiles.active_role
    END;

-- 2. KHUSUS: Pastikan 'achzubaidi07' benar-benar admin (Double Check)
UPDATE public.user_profiles
SET 
    role = 'admin',
    roles = ARRAY['admin'],
    active_role = 'admin'
WHERE username = 'achzubaidi07' OR email ILIKE 'achzubaidi07%';

COMMIT;

-- Tampilkan hasilnya untuk verifikasi
SELECT * FROM public.user_profiles WHERE username = 'achzubaidi07' OR email ILIKE 'achzubaidi07%';
