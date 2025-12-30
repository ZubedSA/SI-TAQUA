-- =====================================================
-- SUPER EMERGENCY FIX: DISABLE RLS SEMENTARA
-- =====================================================
-- Gunakan script ini jika script sebelumnya gagal.
-- Ini akan mematikan security policy sementara agar Anda bisa Login.
-- Setelah Login berhasil, kita bisa perbaiki pelan-pelan.

-- 1. Matikan RLS di tabel yang dicurigai (user_profiles penyebab utama loop)
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE santri DISABLE ROW LEVEL SECURITY;

-- 2. Reset Function ke versi paling sederhana dan AMAN
-- Tanpa RLS, query ini 100% aman dari infinite loop
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(active_role, role, 'guest')
  FROM user_profiles
  WHERE user_id = auth.uid();
$$;

-- 3. Reload Schema Cache
NOTIFY pgrst, 'reload schema';

-- Cobalah Login sekarang.
-- Jika berhasil, jangan lupa untuk mengaktifkan RLS kembali nanti dengan script perbaikan final.
