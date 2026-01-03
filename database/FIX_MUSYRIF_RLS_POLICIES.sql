-- ============================================================================
-- FIX: RLS Policies untuk MUSYRIF
-- ============================================================================
-- Problem: RLS policies tidak include 'musyrif' sehingga data tidak muncul
-- Solution: Update helper functions dan policies untuk support musyrif
-- ============================================================================
-- JALANKAN DI SUPABASE SQL EDITOR
-- ============================================================================

-- ============================================================================
-- 1. Update get_user_role() untuk return active_role jika ada
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
    user_active_role TEXT;
BEGIN
    SELECT role, active_role INTO user_role, user_active_role
    FROM user_profiles
    WHERE user_id = auth.uid();
    
    -- Prioritas: active_role > role
    RETURN COALESCE(user_active_role, user_role, 'guest');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Function get_user_role() updated' as status;

-- ============================================================================
-- 2. Create is_musyrif() function (jika belum ada)
-- ============================================================================

CREATE OR REPLACE FUNCTION is_musyrif()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() = 'musyrif';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_musyrif() TO authenticated;

SELECT '✅ Function is_musyrif() created' as status;

-- ============================================================================
-- 3. Update is_admin_or_guru() untuk include musyrif
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin_or_guru()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() IN ('admin', 'guru', 'musyrif');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Function is_admin_or_guru() updated to include musyrif' as status;

-- ============================================================================
-- 4. Update SANTRI policies untuk include musyrif
-- ============================================================================

DROP POLICY IF EXISTS "santri_select_policy" ON santri;

CREATE POLICY "santri_select_policy" ON santri
FOR SELECT USING (
    CASE get_user_role()
        WHEN 'admin' THEN true
        WHEN 'guru' THEN true
        WHEN 'musyrif' THEN halaqoh_id = ANY(get_musyrif_halaqoh_ids(auth.uid()))
        WHEN 'wali' THEN id = ANY(get_wali_santri_ids())
        ELSE false
    END
);

-- Update policy untuk musyrif bisa update santri di halaqoh-nya
DROP POLICY IF EXISTS "santri_update_policy" ON santri;

CREATE POLICY "santri_update_policy" ON santri
FOR UPDATE USING (
    is_admin_or_guru() OR
    (is_musyrif() AND halaqoh_id = ANY(get_musyrif_halaqoh_ids(auth.uid())))
);

SELECT '✅ Santri policies updated for musyrif' as status;

-- ============================================================================
-- 5. Update HAFALAN policies untuk include musyrif
-- ============================================================================

DROP POLICY IF EXISTS "hafalan_select_policy" ON hafalan;

CREATE POLICY "hafalan_select_policy" ON hafalan
FOR SELECT USING (
    CASE get_user_role()
        WHEN 'admin' THEN true
        WHEN 'guru' THEN true
        WHEN 'musyrif' THEN 
            santri_id IN (
                SELECT id FROM santri WHERE halaqoh_id = ANY(get_musyrif_halaqoh_ids(auth.uid()))
            )
        WHEN 'wali' THEN santri_id = ANY(get_wali_santri_ids())
        ELSE false
    END
);

-- Allow musyrif to insert/update hafalan for santri in their halaqoh
DROP POLICY IF EXISTS "hafalan_insert_policy" ON hafalan;
DROP POLICY IF EXISTS "hafalan_update_policy" ON hafalan;
DROP POLICY IF EXISTS "hafalan_delete_policy" ON hafalan;

CREATE POLICY "hafalan_insert_policy" ON hafalan
FOR INSERT WITH CHECK (
    is_admin_or_guru() OR
    (is_musyrif() AND santri_id IN (
        SELECT id FROM santri WHERE halaqoh_id = ANY(get_musyrif_halaqoh_ids(auth.uid()))
    ))
);

CREATE POLICY "hafalan_update_policy" ON hafalan
FOR UPDATE USING (
    is_admin_or_guru() OR
    (is_musyrif() AND santri_id IN (
        SELECT id FROM santri WHERE halaqoh_id = ANY(get_musyrif_halaqoh_ids(auth.uid()))
    ))
);

CREATE POLICY "hafalan_delete_policy" ON hafalan
FOR DELETE USING (
    is_admin() OR
    (is_musyrif() AND santri_id IN (
        SELECT id FROM santri WHERE halaqoh_id = ANY(get_musyrif_halaqoh_ids(auth.uid()))
    ))
);

SELECT '✅ Hafalan policies updated for musyrif' as status;

-- ============================================================================
-- 6. Update PRESENSI policies untuk include musyrif
-- ============================================================================

DROP POLICY IF EXISTS "presensi_select_policy" ON presensi;

CREATE POLICY "presensi_select_policy" ON presensi
FOR SELECT USING (
    CASE get_user_role()
        WHEN 'admin' THEN true
        WHEN 'guru' THEN true
        WHEN 'musyrif' THEN 
            santri_id IN (
                SELECT id FROM santri WHERE halaqoh_id = ANY(get_musyrif_halaqoh_ids(auth.uid()))
            )
        WHEN 'wali' THEN santri_id = ANY(get_wali_santri_ids())
        ELSE false
    END
);

DROP POLICY IF EXISTS "presensi_insert_policy" ON presensi;
DROP POLICY IF EXISTS "presensi_update_policy" ON presensi;
DROP POLICY IF EXISTS "presensi_delete_policy" ON presensi;

CREATE POLICY "presensi_insert_policy" ON presensi
FOR INSERT WITH CHECK (is_admin_or_guru());

CREATE POLICY "presensi_update_policy" ON presensi
FOR UPDATE USING (is_admin_or_guru());

CREATE POLICY "presensi_delete_policy" ON presensi
FOR DELETE USING (is_admin());

SELECT '✅ Presensi policies updated for musyrif' as status;

-- ============================================================================
-- 7. Update NILAI policies untuk include musyrif
-- ============================================================================

DROP POLICY IF EXISTS "nilai_select_policy" ON nilai;

CREATE POLICY "nilai_select_policy" ON nilai
FOR SELECT USING (
    CASE get_user_role()
        WHEN 'admin' THEN true
        WHEN 'guru' THEN true
        WHEN 'musyrif' THEN 
            santri_id IN (
                SELECT id FROM santri WHERE halaqoh_id = ANY(get_musyrif_halaqoh_ids(auth.uid()))
            )
        WHEN 'wali' THEN santri_id = ANY(get_wali_santri_ids())
        ELSE false
    END
);

DROP POLICY IF EXISTS "nilai_insert_policy" ON nilai;
DROP POLICY IF EXISTS "nilai_update_policy" ON nilai;
DROP POLICY IF EXISTS "nilai_delete_policy" ON nilai;

CREATE POLICY "nilai_insert_policy" ON nilai
FOR INSERT WITH CHECK (is_admin_or_guru());

CREATE POLICY "nilai_update_policy" ON nilai
FOR UPDATE USING (is_admin_or_guru());

CREATE POLICY "nilai_delete_policy" ON nilai
FOR DELETE USING (is_admin());

SELECT '✅ Nilai policies updated for musyrif' as status;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '========================================' as separator;
SELECT '✅ RLS POLICIES FIX UNTUK MUSYRIF SELESAI!' as status;
SELECT '========================================' as separator;

-- Test function
SELECT get_user_role() as current_role;
SELECT is_musyrif() as am_i_musyrif;
