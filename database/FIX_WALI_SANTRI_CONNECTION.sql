-- =====================================================
-- FIX LENGKAP V2: WALI SANTRI CONNECTION
-- =====================================================
-- MASALAH: RLS policy mungkin memblokir UPDATE santri.wali_id
-- SOLUSI: Pastikan admin bisa UPDATE semua santri termasuk wali_id
-- =====================================================

-- =====================================================
-- STEP 1: Pastikan kolom wali_id ada
-- =====================================================
ALTER TABLE santri 
ADD COLUMN IF NOT EXISTS wali_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_santri_wali_id ON santri(wali_id);

-- =====================================================
-- STEP 2: Update get_user_role() untuk Multi-Role
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
    v_active_role TEXT;
    v_legacy_role TEXT;
BEGIN
    SELECT COALESCE(active_role, role), role
    INTO v_active_role, v_legacy_role
    FROM user_profiles
    WHERE user_id = auth.uid();
    
    RETURN COALESCE(v_active_role, v_legacy_role, 'guest');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 3: Update get_wali_santri_ids()
-- =====================================================
CREATE OR REPLACE FUNCTION get_wali_santri_ids()
RETURNS UUID[] AS $$
DECLARE
    santri_ids UUID[];
BEGIN
    SELECT ARRAY_AGG(id) INTO santri_ids
    FROM santri
    WHERE wali_id = auth.uid();
    
    RETURN COALESCE(santri_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 4: FIX RLS untuk SANTRI - SELECT
-- =====================================================
DROP POLICY IF EXISTS "santri_select_policy" ON santri;

CREATE POLICY "santri_select_policy" ON santri
FOR SELECT USING (
    CASE get_user_role()
        WHEN 'admin' THEN true
        WHEN 'guru' THEN true
        WHEN 'bendahara' THEN true
        WHEN 'pengasuh' THEN true
        WHEN 'wali' THEN wali_id = auth.uid()
        ELSE false
    END
);

-- =====================================================
-- STEP 5: FIX RLS untuk SANTRI - UPDATE (CRITICAL!)
-- Admin harus bisa update SEMUA santri termasuk wali_id
-- =====================================================
DROP POLICY IF EXISTS "santri_update_policy" ON santri;

CREATE POLICY "santri_update_policy" ON santri
FOR UPDATE USING (
    CASE get_user_role()
        WHEN 'admin' THEN true
        WHEN 'guru' THEN true
        WHEN 'bendahara' THEN true
        WHEN 'pengasuh' THEN true
        ELSE false
    END
);

-- =====================================================
-- STEP 6: FIX RLS untuk HAFALAN
-- =====================================================
DROP POLICY IF EXISTS "hafalan_select_policy" ON hafalan;

CREATE POLICY "hafalan_select_policy" ON hafalan
FOR SELECT USING (
    CASE get_user_role()
        WHEN 'admin' THEN true
        WHEN 'guru' THEN true
        WHEN 'bendahara' THEN true
        WHEN 'pengasuh' THEN true
        WHEN 'wali' THEN santri_id IN (SELECT id FROM santri WHERE wali_id = auth.uid())
        ELSE false
    END
);

-- =====================================================
-- STEP 7: FIX RLS untuk PRESENSI
-- =====================================================
DROP POLICY IF EXISTS "presensi_select_policy" ON presensi;

CREATE POLICY "presensi_select_policy" ON presensi
FOR SELECT USING (
    CASE get_user_role()
        WHEN 'admin' THEN true
        WHEN 'guru' THEN true
        WHEN 'bendahara' THEN true
        WHEN 'pengasuh' THEN true
        WHEN 'wali' THEN santri_id IN (SELECT id FROM santri WHERE wali_id = auth.uid())
        ELSE false
    END
);

-- =====================================================
-- STEP 8: FIX RLS untuk NILAI
-- =====================================================
DROP POLICY IF EXISTS "nilai_select_policy" ON nilai;

CREATE POLICY "nilai_select_policy" ON nilai
FOR SELECT USING (
    CASE get_user_role()
        WHEN 'admin' THEN true
        WHEN 'guru' THEN true
        WHEN 'bendahara' THEN true
        WHEN 'pengasuh' THEN true
        WHEN 'wali' THEN santri_id IN (SELECT id FROM santri WHERE wali_id = auth.uid())
        ELSE false
    END
);

-- =====================================================
-- STEP 9: Grant permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION get_wali_santri_ids() TO authenticated;

-- =====================================================
-- STEP 10: Ensure user_profiles columns exist
-- =====================================================
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS active_role VARCHAR(50);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS roles TEXT[];

-- =====================================================
-- STEP 11: MANUAL FIX - Hubungkan Wali ke Santri
-- =====================================================
-- PENTING: Jalankan query dibawah ini SETELAH semua fix diatas

-- 11.1 Cek user_id wali
SELECT user_id, email, nama, role, active_role 
FROM user_profiles 
WHERE role = 'wali' OR active_role = 'wali';

-- 11.2 Cek semua santri
SELECT id, nis, nama, wali_id FROM santri ORDER BY nama;

-- 11.3 HUBUNGKAN WALI KE SANTRI (Ganti nilai sesuai data Anda)
-- UPDATE santri SET wali_id = '1b9185ed-bd10-4677-931a-df38d1e4897d' WHERE nis = 'NIS_SANTRI_ANAK';

-- =====================================================
-- STEP 12: VERIFICATION
-- =====================================================
-- Setelah update, jalankan query ini:

-- Check jumlah santri per wali
SELECT 
    up.user_id,
    up.email,
    up.nama,
    up.role,
    up.active_role,
    (SELECT COUNT(*) FROM santri WHERE wali_id = up.user_id) as jumlah_santri
FROM user_profiles up
WHERE up.role = 'wali' OR up.active_role = 'wali';

-- Check santri yang terhubung ke wali
SELECT 
    s.nis,
    s.nama as nama_santri,
    up.nama as nama_wali,
    up.email as email_wali
FROM santri s
JOIN user_profiles up ON up.user_id = s.wali_id
WHERE s.wali_id IS NOT NULL;

DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'FIX V2 COMPLETE!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'LANGKAH SELANJUTNYA:';
    RAISE NOTICE '1. Jalankan query 11.1 untuk cek user_id wali';
    RAISE NOTICE '2. Jalankan query 11.2 untuk cek santri';
    RAISE NOTICE '3. Jalankan UPDATE di 11.3 dengan data yang benar';
    RAISE NOTICE '4. Jalankan query 12 untuk verifikasi';
    RAISE NOTICE '5. LOGIN ULANG sebagai wali';
    RAISE NOTICE '===========================================';
END $$;
