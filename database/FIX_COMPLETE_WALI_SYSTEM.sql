-- =====================================================
-- FIX LENGKAP: SISTEM WALI-SANTRI CONNECTION
-- =====================================================
-- Jalankan di Supabase SQL Editor
-- File ini AMAN dan tidak menghapus data yang ada
-- =====================================================

-- =====================================================
-- STEP 1: Pastikan kolom wali_id ada di santri
-- =====================================================
ALTER TABLE santri 
ADD COLUMN IF NOT EXISTS wali_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_santri_wali_id ON santri(wali_id);

-- =====================================================
-- STEP 2: Update get_user_role() untuk multi-role
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
    v_active_role TEXT;
    v_role TEXT;
BEGIN
    SELECT COALESCE(active_role, role), role
    INTO v_active_role, v_role
    FROM user_profiles
    WHERE user_id = auth.uid();
    
    RETURN COALESCE(v_active_role, v_role, 'guest');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;

-- =====================================================
-- STEP 3: Update RLS Policy SANTRI - SELECT
-- Wali hanya bisa lihat santri dengan wali_id = auth.uid()
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
-- STEP 4: Update RLS Policy SANTRI - UPDATE
-- Admin bisa update semua santri (termasuk set wali_id)
-- =====================================================
DROP POLICY IF EXISTS "santri_update_policy" ON santri;

CREATE POLICY "santri_update_policy" ON santri
FOR UPDATE USING (
    get_user_role() IN ('admin', 'guru', 'bendahara', 'pengasuh')
);

-- =====================================================
-- STEP 5: Pastikan user_profiles punya kolom yang diperlukan
-- =====================================================
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS active_role VARCHAR(50);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS roles TEXT[];

-- Update active_role untuk user yang belum punya
UPDATE user_profiles 
SET active_role = role 
WHERE active_role IS NULL AND role IS NOT NULL;

-- =====================================================
-- STEP 6: VERIFIKASI 
-- =====================================================

-- Cek policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'santri';

-- Cek user wali
SELECT user_id, email, nama, role, active_role 
FROM user_profiles 
WHERE role = 'wali' OR active_role = 'wali';

-- =====================================================
-- STEP 7: HUBUNGKAN WALI KE SANTRI
-- =====================================================
-- PENTING: Ganti nilai dengan data yang benar!
-- 
-- Contoh:
-- UPDATE santri SET wali_id = 'UUID_WALI' WHERE nis = 'NIS_SANTRI';
--
-- Untuk dapat UUID wali:
-- SELECT user_id FROM user_profiles WHERE email = 'email_wali';

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'SQL FIX SELESAI!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Langkah selanjutnya:';
    RAISE NOTICE '1. Jalankan query UPDATE di STEP 7 untuk hubungkan wali ke santri';
    RAISE NOTICE '2. Atau edit user wali di halaman admin dan pilih santri';
    RAISE NOTICE '=====================================================';
END $$;
