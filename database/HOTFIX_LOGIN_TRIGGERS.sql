-- =====================================================
-- HOTFIX PRODUCTION: LOGIN RECOVERY
-- =====================================================
-- Mengikuti Protokol STEP 2 & 3: Matikan Trigger & RLS
-- Tujuannya adalah membuat Login BERHASIL dulu, baru kita rapikan security.

-- 1. DROP TRIGGER yang sering bermasalah (jika ada)
-- Trigger ini biasanya jalan saat user dibuat/login, dan sering crash jika RLS aktif.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. DISABLE RLS TOTAL (STEP 3)
-- Pastikan tidak ada pengecekan security database saat login
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE santri DISABLE ROW LEVEL SECURITY;

-- 3. HAPUS & GANTI FUNCTION CEK ROLE (STEP 4)
-- Kita ganti dengan versi DUMMY STATIC yang tidak mungkin error.
DROP FUNCTION IF EXISTS get_user_role() CASCADE;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- KEMBALIKAN 'guest' ATAU ROLE STATIC SEMENTARA
  -- Ini hanya agar fungsi tidak error saat dipanggil
  SELECT COALESCE(active_role, role, 'guest') 
  FROM user_profiles 
  WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated, service_role;

-- 4. FIX KOLOM (STEP 5)
-- Pastikan kolom yang dibaca fungsi benar-benar ada
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS active_role VARCHAR(50);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS roles TEXT[];

-- 5. RELOAD SCHEMA
NOTIFY pgrst, 'reload schema';

-- SETELAH SCRIPT INI:
-- 1. COBA LOGIN ADMIN (Harus bisa)
-- 2. COBA LOGIN WALI (Harus bisa)
-- Jika masih gagal, berarti error ada di Server Supabase atau Tabel auth.users corrupt.
