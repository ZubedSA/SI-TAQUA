-- =====================================================
-- FIX: DATA TIDAK MUNCUL (VISIBILITY)
-- =====================================================
-- Masalah: Script sebelumnya membatasi akses "Hanya bisa lihat profil sendiri".
-- Akibatnya: Admin tidak bisa melihat daftar user lain (kosong).

-- Solusi: Izinkan semua user yang LOGIN (Authenticated) untuk melihat daftar user.
-- Ini aman untuk aplikasi internal sekolah.

-- 1. Matikan RLS Sementara (untuk memastikan akses terbuka dulu)
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop Policy yang terlalu ketat
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can view specific columns" ON user_profiles;

-- 3. Nyalakan RLS lagi tapi dengan aturan yang lebih longgar
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Buat Policy "Public Read" untuk User Login
-- Artinya: "Siapapun yang sudah login, boleh melihat daftar nama & role user lain"
CREATE POLICY "Authenticated users can view all profiles" ON user_profiles
FOR SELECT USING (
  auth.role() = 'authenticated'
);

-- 5. Tetap batasi UPDATE hanya ke profil sendiri (Kecuali Admin nanti)
-- Tapi untuk sekarang biar aman, own profile update only dulu agar tidak error.
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
FOR UPDATE USING (
  auth.uid() = user_id
);

-- 6. Refresh Schema
NOTIFY pgrst, 'reload schema';

-- Sekarang halaman Users seharusnya sudah tampil datanya kembali.
