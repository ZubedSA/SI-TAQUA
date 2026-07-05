-- ==========================================
-- FIX_SPECIFIC_ADMIN.sql
-- ==========================================
-- Mengubah user tertentu menjadi ADMIN sepenuhnya.
-- Solusi untuk user "achzubaidi07" yang dashboardnya kosong.

BEGIN;

-- Update Profil user 'achzubaidi07'
UPDATE public.user_profiles
SET 
    role = 'admin',
    roles = CASE 
        WHEN 'admin' = ANY(roles) THEN roles -- Jika sudah ada, biarkan
        ELSE array_append(roles, 'admin')    -- Jika belum, tambahkan
    END,
    active_role = 'admin'
WHERE 
    username = 'achzubaidi07' -- Target spesifik
    OR email ILIKE 'achzubaidi07%'; -- Jaga-jaga jika username beda

COMMIT;

-- Cek hasilnya
SELECT username, role, roles, active_role 
FROM public.user_profiles 
WHERE username = 'achzubaidi07';
