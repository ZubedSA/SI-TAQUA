-- =============================================
-- FIX RLS POLICIES - SISTEM PENGURUS
-- =============================================
-- Problem: "permission denied for table users" saat menyimpan pelanggaran.
-- Cause: RLS policies sebelumnya mungkin mengakses auth.users secara langsung
--        atau menggunakan fungsi yang tidak kompatibel dengan hak akses client.
-- Solution: Gunakan user_profiles (kolom roles array) untuk verifikasi akses.

BEGIN;

-- =============================================
-- 1. DROP EXISTING POLICIES (Idempotent)
-- =============================================

-- Pelanggaran
DROP POLICY IF EXISTS "pelanggaran_select" ON pelanggaran;
DROP POLICY IF EXISTS "pelanggaran_insert" ON pelanggaran;
DROP POLICY IF EXISTS "pelanggaran_update" ON pelanggaran;
DROP POLICY IF EXISTS "pelanggaran_delete" ON pelanggaran;
DROP POLICY IF EXISTS "Pelanggaran viewable by authenticated" ON pelanggaran;
DROP POLICY IF EXISTS "Pelanggaran insertable by pengurus/admin" ON pelanggaran;

-- Tindak Lanjut
DROP POLICY IF EXISTS "tindak_lanjut_select" ON tindak_lanjut_pelanggaran;
DROP POLICY IF EXISTS "tindak_lanjut_insert" ON tindak_lanjut_pelanggaran;
DROP POLICY IF EXISTS "tindak_lanjut_update" ON tindak_lanjut_pelanggaran;
DROP POLICY IF EXISTS "tindak_lanjut_delete" ON tindak_lanjut_pelanggaran;

-- Catatan Pembinaan
DROP POLICY IF EXISTS "catatan_select" ON catatan_pembinaan;
DROP POLICY IF EXISTS "catatan_insert" ON catatan_pembinaan;
DROP POLICY IF EXISTS "catatan_update" ON catatan_pembinaan;
DROP POLICY IF EXISTS "catatan_delete" ON catatan_pembinaan;

-- Pengumuman Internal
DROP POLICY IF EXISTS "pengumuman_select" ON pengumuman_internal;
DROP POLICY IF EXISTS "pengumuman_insert" ON pengumuman_internal;
DROP POLICY IF EXISTS "pengumuman_update" ON pengumuman_internal;
DROP POLICY IF EXISTS "pengumuman_delete" ON pengumuman_internal;

-- =============================================
-- 2. ENABLE RLS
-- =============================================
ALTER TABLE pelanggaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE tindak_lanjut_pelanggaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE catatan_pembinaan ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengumuman_internal ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 3. CREATE NEW POLICIES (Staff Access)
-- =============================================

-- HELPER: Cek apakah user adalah Staff (Admin/Guru/Pengurus/Musyrif)
-- Kita gunakan subquery EXISTS pada user_profiles agar aman dan cepat.

-- =========== PELANGGARAN ===========
CREATE POLICY "pelanggaran_view_all" ON pelanggaran 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "pelanggaran_staff_manage" ON pelanggaran
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND (
            'admin' = ANY(user_profiles.roles) OR
            'pengurus' = ANY(user_profiles.roles) OR
            'guru' = ANY(user_profiles.roles) OR
            'musyrif' = ANY(user_profiles.roles)
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND (
            'admin' = ANY(user_profiles.roles) OR
            'pengurus' = ANY(user_profiles.roles) OR
            'guru' = ANY(user_profiles.roles) OR
            'musyrif' = ANY(user_profiles.roles)
        )
    )
);

-- =========== TINDAK LANJUT ===========
CREATE POLICY "tindak_lanjut_view_all" ON tindak_lanjut_pelanggaran 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "tindak_lanjut_staff_manage" ON tindak_lanjut_pelanggaran
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND (
            'admin' = ANY(user_profiles.roles) OR
            'pengurus' = ANY(user_profiles.roles) OR
            'guru' = ANY(user_profiles.roles) OR
            'musyrif' = ANY(user_profiles.roles)
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND (
            'admin' = ANY(user_profiles.roles) OR
            'pengurus' = ANY(user_profiles.roles) OR
            'guru' = ANY(user_profiles.roles) OR
            'musyrif' = ANY(user_profiles.roles)
        )
    )
);

-- =========== CATATAN PEMBINAAN (Private) ===========
-- Hanya staff yang bisa melihat/mengelola catatan pembinaan
CREATE POLICY "catatan_staff_manage" ON catatan_pembinaan
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND (
            'admin' = ANY(user_profiles.roles) OR
            'pengurus' = ANY(user_profiles.roles) OR
            'guru' = ANY(user_profiles.roles) OR
            'musyrif' = ANY(user_profiles.roles)
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND (
            'admin' = ANY(user_profiles.roles) OR
            'pengurus' = ANY(user_profiles.roles) OR
            'guru' = ANY(user_profiles.roles) OR
            'musyrif' = ANY(user_profiles.roles)
        )
    )
);

-- =========== PENGUMUMAN INTERNAL ===========
CREATE POLICY "pengumuman_view_all" ON pengumuman_internal 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "pengumuman_staff_manage" ON pengumuman_internal
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND (
            'admin' = ANY(user_profiles.roles) OR
            'pengurus' = ANY(user_profiles.roles)
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND (
            'admin' = ANY(user_profiles.roles) OR
            'pengurus' = ANY(user_profiles.roles)
        )
    )
);

COMMIT;

-- VERIFIKASI
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('pelanggaran', 'tindak_lanjut_pelanggaran', 'catatan_pembinaan', 'pengumuman_internal');
