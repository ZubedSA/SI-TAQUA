-- ==========================================
-- CHECK_ADMIN_PROFILES.sql
-- ==========================================
-- Cek kondisi data profil user (terutama admin lama) 
-- untuk melihat kenapa dapat layar putih/kosong.

SELECT 
    id, 
    user_id, 
    email, 
    username, 
    UPPER(role) as role, 
    roles, 
    active_role, 
    created_at
FROM public.user_profiles
ORDER BY created_at DESC;

-- Cek juga apakah ada di Auth tapi TIDAK ada di Profile
SELECT 
    au.id as auth_id, 
    au.email as auth_email,
    up.username as profile_username
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL;
