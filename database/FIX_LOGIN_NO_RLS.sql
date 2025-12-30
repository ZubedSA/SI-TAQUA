-- =====================================================
-- DIAGNOSTIC FIX: DISABLE SECURITY (TEST LOGIN)
-- =====================================================
-- Script ini mematikan semua pengaman (RLS) untuk membiarkan Wali Login.
-- Tujuannya: Memastikan apakah error berasal dari RLS/Trigger.

-- 1. Matikan RLS (Row Level Security)
-- Ini membuat tabel bisa diakses bebas (sementara)
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE santri DISABLE ROW LEVEL SECURITY;

-- 2. Hapus Fungsi Utilitas yang mungkin Error/Rekursif
-- Kita ganti dengan versi SQL murni yang sangat cepat & aman
DROP FUNCTION IF EXISTS get_user_role() CASCADE;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS active_role VARCHAR(50);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS roles TEXT[];

-- Update null values
UPDATE user_profiles SET active_role = role WHERE active_role IS NULL;

-- 3. Buat Fungsi Minimalis (Tanpa Logic Rumit)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Langsung ambil dari tabel tanpa cek RLS (karena RLS tabel sudah mati)
  SELECT COALESCE(active_role, role, 'guest')
  FROM user_profiles
  WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated, service_role;

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload schema';

-- INSTRUKSI:
-- 1. Jalankan script ini.
-- 2. Coba Login Wali.
-- 3. JIKA BERHASIL: Berarti masalahnya memang di RLS. Kita akan aktifkan kembali satu per satu nanti.
-- 4. JIKA GAGAL: Berarti ada Trigger rahasia di tabel auth.users yang error.
