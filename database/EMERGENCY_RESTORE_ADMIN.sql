-- =========================================================================
-- EMERGENCY_RESTORE_ADMIN.sql
-- PERBAIKAN DARURAT: Kembalikan akses Admin
-- =========================================================================

-- Langsung update tanpa BEGIN/COMMIT untuk menghindari error apapun

-- 1. Update profil user achzubaidi07 menjadi ADMIN
UPDATE public.user_profiles 
SET 
    role = 'admin',
    active_role = 'admin',
    roles = ARRAY['admin']::text[]
WHERE email = 'achzubaidi07@gmail.com';

-- 2. Backup: Update berdasarkan email yang mengandung admin/zubaidi
UPDATE public.user_profiles 
SET 
    role = 'admin',
    active_role = 'admin',
    roles = ARRAY['admin']::text[]
WHERE email ILIKE '%zubaidi%' OR email ILIKE '%admin%';

-- 3. DONE
SELECT 'SELESAI. Silakan REFRESH browser (Ctrl+Shift+R) dan login ulang.' as status;
