-- ==========================================
-- VERIFY_USER_EXISTENCE.sql
-- ==========================================
-- Cek apakah user 'achzubaidi07' benar-benar ada di tabel?

SELECT 'AUTH TABLE' as source, id, email, raw_user_meta_data 
FROM auth.users 
WHERE email ILIKE '%achzubaidi07%';

SELECT 'PROFILE TABLE' as source, user_id, username, role, roles 
FROM public.user_profiles 
WHERE email ILIKE '%achzubaidi07%' OR username = 'achzubaidi07';
