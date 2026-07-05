-- =====================================================
-- RLS POLICIES: SISTEM PENGURUS
-- Sistem Akademik PTQ Al-Usymuni Batuan
-- =====================================================
-- JALANKAN SQL INI SETELAH migration_pengurus_system.sql
-- =====================================================

-- =====================================================
-- 1. HELPER FUNCTIONS
-- =====================================================

-- Function untuk cek apakah user adalah admin atau pengurus
CREATE OR REPLACE FUNCTION is_admin_or_pengurus()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() IN ('admin', 'pengurus');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function untuk cek apakah user adalah pengurus
CREATE OR REPLACE FUNCTION is_pengurus()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() = 'pengurus';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant function access
GRANT EXECUTE ON FUNCTION is_admin_or_pengurus() TO authenticated;
GRANT EXECUTE ON FUNCTION is_pengurus() TO authenticated;

-- =====================================================
-- 2. ENABLE RLS PADA SEMUA TABEL BARU
-- =====================================================

ALTER TABLE pelanggaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE tindak_lanjut_pelanggaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengumuman_internal ENABLE ROW LEVEL SECURITY;
ALTER TABLE informasi_pondok ENABLE ROW LEVEL SECURITY;
ALTER TABLE buletin_pondok ENABLE ROW LEVEL SECURITY;
ALTER TABLE catatan_pembinaan ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. PELANGGARAN POLICIES
-- Admin & Pengurus: Full CRUD (delete hanya admin)
-- =====================================================

DROP POLICY IF EXISTS "pelanggaran_select" ON pelanggaran;
CREATE POLICY "pelanggaran_select" ON pelanggaran
FOR SELECT USING (is_admin_or_pengurus());

DROP POLICY IF EXISTS "pelanggaran_insert" ON pelanggaran;
CREATE POLICY "pelanggaran_insert" ON pelanggaran
FOR INSERT WITH CHECK (is_admin_or_pengurus());

DROP POLICY IF EXISTS "pelanggaran_update" ON pelanggaran;
CREATE POLICY "pelanggaran_update" ON pelanggaran
FOR UPDATE USING (is_admin_or_pengurus());

DROP POLICY IF EXISTS "pelanggaran_delete" ON pelanggaran;
CREATE POLICY "pelanggaran_delete" ON pelanggaran
FOR DELETE USING (is_admin()); -- Hanya admin yang bisa hapus

-- =====================================================
-- 4. TINDAK LANJUT PELANGGARAN POLICIES
-- =====================================================

DROP POLICY IF EXISTS "tindak_lanjut_select" ON tindak_lanjut_pelanggaran;
CREATE POLICY "tindak_lanjut_select" ON tindak_lanjut_pelanggaran
FOR SELECT USING (is_admin_or_pengurus());

DROP POLICY IF EXISTS "tindak_lanjut_insert" ON tindak_lanjut_pelanggaran;
CREATE POLICY "tindak_lanjut_insert" ON tindak_lanjut_pelanggaran
FOR INSERT WITH CHECK (is_admin_or_pengurus());

DROP POLICY IF EXISTS "tindak_lanjut_update" ON tindak_lanjut_pelanggaran;
CREATE POLICY "tindak_lanjut_update" ON tindak_lanjut_pelanggaran
FOR UPDATE USING (is_admin_or_pengurus());

DROP POLICY IF EXISTS "tindak_lanjut_delete" ON tindak_lanjut_pelanggaran;
CREATE POLICY "tindak_lanjut_delete" ON tindak_lanjut_pelanggaran
FOR DELETE USING (is_admin()); -- Hanya admin

-- =====================================================
-- 5. PENGUMUMAN INTERNAL POLICIES
-- All authenticated users can read, pengurus/admin can write
-- =====================================================

DROP POLICY IF EXISTS "pengumuman_select" ON pengumuman_internal;
CREATE POLICY "pengumuman_select" ON pengumuman_internal
FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "pengumuman_insert" ON pengumuman_internal;
CREATE POLICY "pengumuman_insert" ON pengumuman_internal
FOR INSERT WITH CHECK (is_admin_or_pengurus());

DROP POLICY IF EXISTS "pengumuman_update" ON pengumuman_internal;
CREATE POLICY "pengumuman_update" ON pengumuman_internal
FOR UPDATE USING (is_admin_or_pengurus());

DROP POLICY IF EXISTS "pengumuman_delete" ON pengumuman_internal;
CREATE POLICY "pengumuman_delete" ON pengumuman_internal
FOR DELETE USING (is_admin()); -- Hanya admin

-- =====================================================
-- 6. INFORMASI PONDOK POLICIES
-- =====================================================

DROP POLICY IF EXISTS "informasi_select" ON informasi_pondok;
CREATE POLICY "informasi_select" ON informasi_pondok
FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "informasi_insert" ON informasi_pondok;
CREATE POLICY "informasi_insert" ON informasi_pondok
FOR INSERT WITH CHECK (is_admin_or_pengurus());

DROP POLICY IF EXISTS "informasi_update" ON informasi_pondok;
CREATE POLICY "informasi_update" ON informasi_pondok
FOR UPDATE USING (is_admin_or_pengurus());

DROP POLICY IF EXISTS "informasi_delete" ON informasi_pondok;
CREATE POLICY "informasi_delete" ON informasi_pondok
FOR DELETE USING (is_admin()); -- Hanya admin

-- =====================================================
-- 7. BULETIN PONDOK POLICIES
-- =====================================================

DROP POLICY IF EXISTS "buletin_select" ON buletin_pondok;
CREATE POLICY "buletin_select" ON buletin_pondok
FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "buletin_insert" ON buletin_pondok;
CREATE POLICY "buletin_insert" ON buletin_pondok
FOR INSERT WITH CHECK (is_admin_or_pengurus());

DROP POLICY IF EXISTS "buletin_update" ON buletin_pondok;
CREATE POLICY "buletin_update" ON buletin_pondok
FOR UPDATE USING (is_admin_or_pengurus());

DROP POLICY IF EXISTS "buletin_delete" ON buletin_pondok;
CREATE POLICY "buletin_delete" ON buletin_pondok
FOR DELETE USING (is_admin()); -- Hanya admin

-- =====================================================
-- 8. CATATAN PEMBINAAN POLICIES
-- Admin & Pengurus only (private notes)
-- =====================================================

DROP POLICY IF EXISTS "catatan_select" ON catatan_pembinaan;
CREATE POLICY "catatan_select" ON catatan_pembinaan
FOR SELECT USING (is_admin_or_pengurus());

DROP POLICY IF EXISTS "catatan_insert" ON catatan_pembinaan;
CREATE POLICY "catatan_insert" ON catatan_pembinaan
FOR INSERT WITH CHECK (is_admin_or_pengurus());

DROP POLICY IF EXISTS "catatan_update" ON catatan_pembinaan;
CREATE POLICY "catatan_update" ON catatan_pembinaan
FOR UPDATE USING (is_admin_or_pengurus());

DROP POLICY IF EXISTS "catatan_delete" ON catatan_pembinaan;
CREATE POLICY "catatan_delete" ON catatan_pembinaan
FOR DELETE USING (is_admin()); -- Hanya admin

-- =====================================================
-- 9. VERIFICATION
-- =====================================================

-- Cek policies yang dibuat
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd 
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('pelanggaran', 'tindak_lanjut_pelanggaran', 
                  'pengumuman_internal', 'informasi_pondok', 
                  'buletin_pondok', 'catatan_pembinaan')
ORDER BY tablename, policyname;

-- =====================================================
-- RLS POLICIES SELESAI
-- =====================================================
