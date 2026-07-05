-- =====================================================
-- FIX: STRICT WALI ACCESS RLS
-- =====================================================
-- Mengatasi masalah Wali bisa melihat data santri lain.
-- Memastikan kebijakan RLS menggunakan kolom santri.wali_id
-- =====================================================

-- 1. Redefine Helper Functions to be absolutely sure
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM user_profiles
    WHERE user_id = auth.uid();
    
    RETURN COALESCE(user_role, 'guest');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function Helper untuk mendapatkan list ID santri milik wali yang sedang login
CREATE OR REPLACE FUNCTION get_my_santri_ids_v2()
RETURNS UUID[] AS $$
DECLARE
    ids UUID[];
BEGIN
    SELECT ARRAY_AGG(id) INTO ids
    FROM santri
    WHERE wali_id = auth.uid();
    
    RETURN COALESCE(ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_santri_ids_v2() TO authenticated;

-- =====================================================
-- 2. SANTRI TABLE RLS
-- =====================================================
DROP POLICY IF EXISTS "santri_select_strict_policy" ON santri;
DROP POLICY IF EXISTS "santri_select_policy" ON santri;

CREATE POLICY "santri_select_strict_policy" ON santri
FOR SELECT USING (
    CASE get_current_user_role()
        WHEN 'admin' THEN true
        WHEN 'guru' THEN true
        WHEN 'wali' THEN wali_id = auth.uid()
        ELSE false
    END
);

-- =====================================================
-- 3. HAFALAN TABLE RLS
-- =====================================================
DROP POLICY IF EXISTS "hafalan_select_strict_policy" ON hafalan;
DROP POLICY IF EXISTS "hafalan_select_policy" ON hafalan;

CREATE POLICY "hafalan_select_strict_policy" ON hafalan
FOR SELECT USING (
    CASE get_current_user_role()
        WHEN 'admin' THEN true
        WHEN 'guru' THEN true
        WHEN 'wali' THEN santri_id IN (SELECT id FROM santri WHERE wali_id = auth.uid())
        ELSE false
    END
);

-- =====================================================
-- 4. PRESENSI TABLE RLS
-- =====================================================
DROP POLICY IF EXISTS "presensi_select_strict_policy" ON presensi;
DROP POLICY IF EXISTS "presensi_select_policy" ON presensi;

CREATE POLICY "presensi_select_strict_policy" ON presensi
FOR SELECT USING (
    CASE get_current_user_role()
        WHEN 'admin' THEN true
        WHEN 'guru' THEN true
        WHEN 'wali' THEN santri_id IN (SELECT id FROM santri WHERE wali_id = auth.uid())
        ELSE false
    END
);

-- =====================================================
-- 5. NILAI TABLE RLS
-- =====================================================
DROP POLICY IF EXISTS "nilai_select_strict_policy" ON nilai;
DROP POLICY IF EXISTS "nilai_select_policy" ON nilai;

CREATE POLICY "nilai_select_strict_policy" ON nilai
FOR SELECT USING (
    CASE get_current_user_role()
        WHEN 'admin' THEN true
        WHEN 'guru' THEN true
        WHEN 'wali' THEN santri_id IN (SELECT id FROM santri WHERE wali_id = auth.uid())
        ELSE false
    END
);

-- =====================================================
-- 6. PENCAPAIAN_HAFALAN TABLE RLS (If Exists)
-- =====================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pencapaian_hafalan') THEN
        DROP POLICY IF EXISTS "pencapaian_hafalan_select_strict_policy" ON pencapaian_hafalan;
        DROP POLICY IF EXISTS "pencapaian_hafalan_select_policy" ON pencapaian_hafalan;
        
        CREATE POLICY "pencapaian_hafalan_select_strict_policy" ON pencapaian_hafalan
        FOR SELECT USING (
            CASE get_current_user_role()
                WHEN 'admin' THEN true
                WHEN 'guru' THEN true
                WHEN 'wali' THEN santri_id IN (SELECT id FROM santri WHERE wali_id = auth.uid())
                ELSE false
            END
        );
    END IF;
END $$;

-- =====================================================
-- 7. PERILAKU_SANTRI TABLE RLS (If Exists)
-- =====================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'perilaku_santri') THEN
        DROP POLICY IF EXISTS "perilaku_santri_select_strict_policy" ON perilaku_santri;
        DROP POLICY IF EXISTS "perilaku_santri_select_policy" ON perilaku_santri;
        
        CREATE POLICY "perilaku_santri_select_strict_policy" ON perilaku_santri
        FOR SELECT USING (
            CASE get_current_user_role()
                WHEN 'admin' THEN true
                WHEN 'guru' THEN true
                WHEN 'wali' THEN santri_id IN (SELECT id FROM santri WHERE wali_id = auth.uid())
                ELSE false
            END
        );
    END IF;
END $$;

-- =====================================================
-- 8. TAUJIHAD TABLE RLS (If Exists)
-- =====================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'taujihad') THEN
        DROP POLICY IF EXISTS "taujihad_select_strict_policy" ON taujihad;
        DROP POLICY IF EXISTS "taujihad_select_policy" ON taujihad;
        
        CREATE POLICY "taujihad_select_strict_policy" ON taujihad
        FOR SELECT USING (
            CASE get_current_user_role()
                WHEN 'admin' THEN true
                WHEN 'guru' THEN true
                WHEN 'wali' THEN santri_id IN (SELECT id FROM santri WHERE wali_id = auth.uid())
                ELSE false
            END
        );
    END IF;
END $$;
