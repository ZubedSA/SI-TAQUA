-- =====================================================
-- FIX PERMISSION DENIED FOR TABLE USERS
-- Masalah: Policy RLS tabel 'nilai' mencoba SELECT langsung ke auth.users
-- Solusi: Gunakan auth.jwt() metadata atau tabel user_profiles
-- =====================================================

-- 1. Drop existing policies yang bermasalah
DROP POLICY IF EXISTS "Nilai insertable by guru/admin" ON nilai;
DROP POLICY IF EXISTS "Nilai updatable by creator or admin" ON nilai;
DROP POLICY IF EXISTS "Nilai deletable by admin" ON nilai;

-- 2. Buat ulang policy dengan pendekatan yang aman (User Metadata dari JWT)
-- Helper: auth.jwt() -> 'user_metadata' -> 'role'

-- Policy Insert
CREATE POLICY "Nilai insertable by guru/admin" ON nilai 
FOR INSERT WITH CHECK (
    -- Cek role dari metadata JWT saat ini (lebih cepat & aman)
    (auth.jwt()->'user_metadata'->>'role') IN ('admin', 'guru', 'musyrif')
    OR
    -- Fallback: Cek ke public.user_profiles jika metadata kosong (jarang terjadi)
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid() 
        AND (role IN ('admin', 'guru', 'musyrif') OR 'admin' = ANY(roles))
    )
);

-- Policy Update
CREATE POLICY "Nilai updatable by creator or admin" ON nilai 
FOR UPDATE USING (
    -- Admin boleh update semua
    (auth.jwt()->'user_metadata'->>'role') = 'admin'
    OR
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
    OR
    -- Creator boleh update miliknya
    created_by = auth.uid()
    OR
    -- Guru/Musyrif boleh update jika mereka punya akses (opsional, bisa diperketat)
    (auth.jwt()->'user_metadata'->>'role') IN ('guru', 'musyrif')
);

-- Policy Delete
CREATE POLICY "Nilai deletable by admin" ON nilai 
FOR DELETE USING (
    (auth.jwt()->'user_metadata'->>'role') = 'admin'
    OR
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 3. Pastikan RLS aktif
ALTER TABLE nilai ENABLE ROW LEVEL SECURITY;

-- 4. Verifikasi (Opsional)
-- SELECT count(*) FROM nilai;
