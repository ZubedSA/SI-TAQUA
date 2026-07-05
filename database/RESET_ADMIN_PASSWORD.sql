-- =====================================================
-- RESET PASSWORD ADMIN
-- Jalankan di Supabase SQL Editor
-- Email: achzubaidi07@gmail.com (username: ptqa)
-- Password baru: admin123
-- =====================================================

-- Cek user terlebih dahulu
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at,
    raw_user_meta_data->>'username' as username,
    raw_user_meta_data->>'nama' as nama,
    raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email = 'achzubaidi07@gmail.com';

-- Update password user
-- Password di-hash menggunakan bcrypt
UPDATE auth.users
SET 
    encrypted_password = crypt('admin123', gen_salt('bf')),
    updated_at = now()
WHERE email = 'achzubaidi07@gmail.com';

-- Verifikasi update berhasil
SELECT 
    id,
    email,
    updated_at,
    'Password berhasil direset!' as status
FROM auth.users
WHERE email = 'achzubaidi07@gmail.com';
