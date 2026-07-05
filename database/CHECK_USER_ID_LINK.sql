-- ==========================================
-- CHECK_USER_ID_LINK.sql
-- ==========================================
-- Memeriksa apakah ID di tabel AUTH cocok dengan ID di tabel PROFIL.
-- Jika beda, maka aplikasi tidak akan bisa menemukan profil saat user login.

SELECT 
  au.email,
  au.id AS auth_id,
  up.user_id AS profile_user_id,
  CASE WHEN au.id = up.user_id THEN '✅ MATCH/COCOK' ELSE '❌ MISMATCH/BEDA' END AS status,
  up.role,
  up.username
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.email = up.email
WHERE au.email ILIKE 'achzubaidi07%';
