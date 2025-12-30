-- =====================================================
-- FIX URUTAN DATABASE (SOLUSI FINAL)
-- =====================================================
-- Penyebab Error: 
-- Script sebelumnya mencoba membuat fungsi 'get_user_role' yang membaca kolom 'active_role'
-- PADAHAL kolom 'active_role' baru dibuat di bawahnya. 
-- Akibatnya fungsi rusak & bikin error login.

-- SOLUSI: Kita buat kolomnya DULUAN, baru fungsinya.

-- 1. Pastikan Kolom Ada Dulu (Urutan Benar)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS active_role VARCHAR(50);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS roles TEXT[];

-- Update data kosong agar tidak null
UPDATE user_profiles 
SET active_role = role 
WHERE active_role IS NULL AND role IS NOT NULL;

-- 2. Hapus Fungsi Rusak & Buat Ulang (Versi Aman)
DROP FUNCTION IF EXISTS get_user_role() CASCADE;

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

GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated, service_role;

-- 3. Kembalikan RLS (Nyalakan Lagi Security)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE santri ENABLE ROW LEVEL SECURITY;

-- 4. Reset Policy user_profiles ke Default yang Aman
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can view specific columns" ON user_profiles;

-- Policy Login Aman (User bisa lihat row-nya sendiri)
CREATE POLICY "Users can view own profile" ON user_profiles
FOR SELECT USING (
  auth.uid() = user_id
);

-- Policy Service Role (Untuk register user baru)
DROP POLICY IF EXISTS "Service Role can insert profile" ON user_profiles;
CREATE POLICY "Service Role can insert profile" ON user_profiles
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- 5. Refresh Schema
NOTIFY pgrst, 'reload schema';

-- SELESAI. Silakan coba Login kembali.
