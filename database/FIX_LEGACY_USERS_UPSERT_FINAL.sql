-- ==========================================
-- FIX_LEGACY_USERS_UPSERT_FINAL.sql
-- ==========================================
-- 1. PERBAIKI CONSTRAINT (Agar role 'santri' diperbolehkan)
-- 2. UPSERT SEMUA USER LAMA (Agar punya profil)

BEGIN;

-- LANGKAH 1: Update Constraint agar lebih fleksibel
-- Kita drop dulu constraint lama yang terlalu ketat
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Kita buat constraint baru yang membolehkan santri/siswa
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('admin', 'guru', 'santri', 'siswa', 'wali', 'bendahara', 'pengurus', 'musyrif', 'kepala_sekolah', 'guest'));

-- LANGKAH 2: JALANKAN UPSERT (Sekarang harusnya berhasil)
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
    -- Username:
    COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1)),
    -- Nama:
    COALESCE(au.raw_user_meta_data->>'nama', split_part(au.email, '@', 1)),
    -- Role Logic:
    CASE 
        WHEN au.email ILIKE '%admin%' OR au.raw_user_meta_data->>'username' ILIKE '%admin%' THEN 'admin'
        WHEN au.email ILIKE 'achzubaidi07%' THEN 'admin'
        WHEN au.email ILIKE '%guru%' OR au.email ILIKE '%ust%' THEN 'guru'
        ELSE 'santri' -- Default sekarang aman karena sudah di-allow
    END,
    -- Roles Array Logic:
    CASE 
        WHEN au.email ILIKE '%admin%' OR au.raw_user_meta_data->>'username' ILIKE '%admin%' THEN ARRAY['admin']
        WHEN au.email ILIKE 'achzubaidi07%' THEN ARRAY['admin']
        WHEN au.email ILIKE '%guru%' OR au.email ILIKE '%ust%' THEN ARRAY['guru']
        ELSE ARRAY['santri']
    END,
    -- Active Role Logic:
    CASE 
        WHEN au.email ILIKE '%admin%' OR au.raw_user_meta_data->>'username' ILIKE '%admin%' THEN 'admin'
        WHEN au.email ILIKE 'achzubaidi07%' THEN 'admin'
        WHEN au.email ILIKE '%guru%' OR au.email ILIKE '%ust%' THEN 'guru'
        ELSE 'santri'
    END,
    NOW(),
    NOW()
FROM auth.users au
ON CONFLICT (user_id) DO UPDATE
SET 
    role = CASE 
        WHEN EXCLUDED.email ILIKE 'achzubaidi07%' THEN 'admin' 
        ELSE public.user_profiles.role -- Jangan ubah user lain yg sudah ada
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

COMMIT;

SELECT '✅ DONE. Constraint diperbaiki & User lama berhasil di-restore.' as status;
