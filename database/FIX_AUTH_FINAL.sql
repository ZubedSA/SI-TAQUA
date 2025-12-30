-- =====================================================
-- FIX AUTH FINAL: CLEANUP & REBUILD
-- =====================================================
-- Mengatasi Error "Database error querying schema" pada Login Wali
-- Fokus: Membersihkan Recursion RLS dan memastikan Function aman.

-- 1. CLEANUP TOTAL (CASCADE)
-- Hapus fungsi get_user_role beserta semua policy yang menggunakannya
DROP FUNCTION IF EXISTS get_user_role() CASCADE;

-- 2. PASTIIN KOLOM ADA (Urutan Benar)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS active_role VARCHAR(50);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS roles TEXT[];

-- Isi default jika null
UPDATE user_profiles SET active_role = role WHERE active_role IS NULL;

-- 3. DISABLE RLS SEMENTARA (Untuk Reset)
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE santri DISABLE ROW LEVEL SECURITY;

-- 4. RECREATE FUNCTION (SECURITY DEFINER + SEARCH PATH)
-- Gunakan 'SECURITY DEFINER' agar fungsi berjalan dengan hak akses pembuat (postgres),
-- sehingga mem-bypass RLS tabel user_profiles saat dijalankan.
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

-- 5. REBUILD USER_PROFILES POLICY (NON-RECURSIVE)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid "already exists" error
DROP POLICY IF EXISTS "Authenticated users can see all" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service Role insert" ON user_profiles;

-- Policy 1: Authenticated User bisa LIHAT semua profil (Nama/Role)
-- Ini AMAN dari recursion karena tidak memanggil get_user_role()
-- Dan PENTING agar Admin/Guru bisa melihat data Wali/Santri.
CREATE POLICY "Authenticated users can see all" ON user_profiles
FOR SELECT USING (
  auth.role() = 'authenticated'
);

-- Policy 2: User hanya bisa EDIT profil sendiri
CREATE POLICY "Users can update own profile" ON user_profiles
FOR UPDATE USING (
  auth.uid() = user_id
);

-- Policy 3: Service Role (Auth) bisa INSERT
CREATE POLICY "Service Role insert" ON user_profiles
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- 6. REBUILD SANTRI POLICY (RELASI WALI)
ALTER TABLE santri ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "santri_select_final" ON santri;
DROP POLICY IF EXISTS "santri_update_final" ON santri;

-- Policy Santri: Memanggil get_user_role()
-- INI AMAN SEKARANG karena get_user_role() query user_profiles yang policy-nya 'access all'.
-- Tidak ada looping.
CREATE POLICY "santri_select_final" ON santri
FOR SELECT USING (
  get_user_role() IN ('admin', 'guru', 'bendahara', 'pengasuh') OR
  (get_user_role() = 'wali' AND wali_id = auth.uid()) OR
  (get_user_role() = 'wali' AND wali_id IS NULL)
);

-- Policy Update Santri (Admin Only)
CREATE POLICY "santri_update_final" ON santri
FOR UPDATE USING (
  get_user_role() IN ('admin', 'guru', 'bendahara', 'pengasuh')
);

-- 7. NOTIFY RELOAD
NOTIFY pgrst, 'reload schema';

-- SELESAI. Login Wali harusnya AMAN.
