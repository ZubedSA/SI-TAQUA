-- =============================================
-- JALANKAN SQL INI DI SUPABASE SQL EDITOR
-- =============================================

-- 1. Buat tabel user_profiles jika belum ada
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    no_telp VARCHAR(20),
    nama VARCHAR(255),
    role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin', 'guru', 'wali')),
    santri_id UUID REFERENCES santri(id),
    guru_id UUID REFERENCES guru(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 1b. Tambah kolom no_telp jika belum ada (untuk existing table)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS no_telp VARCHAR(20);

-- 2. Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Policy untuk akses
DROP POLICY IF EXISTS "Allow all access" ON user_profiles;
CREATE POLICY "Allow all access" ON user_profiles FOR ALL USING (true);

-- 4. Insert admin untuk user yang sudah ada
-- Ambil semua user dari auth.users yang belum punya profile
INSERT INTO user_profiles (user_id, email, nama, role)
SELECT 
    id as user_id,
    email,
    COALESCE(raw_user_meta_data->>'nama', 'Administrator') as nama,
    'admin' as role
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_profiles WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

-- 5. Verifikasi data
SELECT * FROM user_profiles;

-- =============================================
-- CONTOH: Tambah user wali santri dengan no_telp
-- =============================================
-- INSERT INTO user_profiles (user_id, email, no_telp, nama, role, santri_id)
-- VALUES ('uuid-dari-auth-users', 'wali@example.com', '081234567890', 'Nama Wali', 'wali', 'uuid-santri');

