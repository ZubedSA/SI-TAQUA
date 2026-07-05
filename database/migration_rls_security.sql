-- =====================================================
-- MIGRATION: ROW LEVEL SECURITY (RLS) POLICIES
-- Sistem Akademik PTQ Al-Usymuni Batuan
-- =====================================================
-- JALANKAN SQL INI DI SUPABASE SQL EDITOR
-- PASTIKAN BACKUP DATABASE TERLEBIH DAHULU!
-- =====================================================

-- =====================================================
-- 1. HELPER FUNCTIONS
-- =====================================================

-- Function untuk mendapatkan role user saat ini
CREATE OR REPLACE FUNCTION get_user_role()
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

-- Function untuk mendapatkan santri_id yang terhubung dengan wali
CREATE OR REPLACE FUNCTION get_wali_santri_ids()
RETURNS UUID[] AS $$
DECLARE
    santri_ids UUID[];
BEGIN
    SELECT ARRAY_AGG(santri_id) INTO santri_ids
    FROM user_profiles
    WHERE user_id = auth.uid() AND santri_id IS NOT NULL;
    
    RETURN COALESCE(santri_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function untuk mendapatkan guru_id user saat ini
CREATE OR REPLACE FUNCTION get_user_guru_id()
RETURNS UUID AS $$
DECLARE
    g_id UUID;
BEGIN
    SELECT guru_id INTO g_id
    FROM user_profiles
    WHERE user_id = auth.uid();
    
    RETURN g_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function untuk cek apakah user adalah admin atau guru
CREATE OR REPLACE FUNCTION is_admin_or_guru()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() IN ('admin', 'guru');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function untuk cek apakah user adalah admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE santri ENABLE ROW LEVEL SECURITY;
ALTER TABLE guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE halaqoh ENABLE ROW LEVEL SECURITY;
ALTER TABLE hafalan ENABLE ROW LEVEL SECURITY;
ALTER TABLE presensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE nilai ENABLE ROW LEVEL SECURITY;
ALTER TABLE mapel ENABLE ROW LEVEL SECURITY;
ALTER TABLE semester ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Jika tabel ini ada, enable juga
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pencapaian_hafalan') THEN
        EXECUTE 'ALTER TABLE pencapaian_hafalan ENABLE ROW LEVEL SECURITY';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'perilaku_santri') THEN
        EXECUTE 'ALTER TABLE perilaku_santri ENABLE ROW LEVEL SECURITY';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'taujihad') THEN
        EXECUTE 'ALTER TABLE taujihad ENABLE ROW LEVEL SECURITY';
    END IF;
END $$;

-- =====================================================
-- 3. DROP EXISTING POLICIES (Clean Start)
-- =====================================================

-- Santri
DROP POLICY IF EXISTS "santri_select_policy" ON santri;
DROP POLICY IF EXISTS "santri_insert_policy" ON santri;
DROP POLICY IF EXISTS "santri_update_policy" ON santri;
DROP POLICY IF EXISTS "santri_delete_policy" ON santri;

-- Guru
DROP POLICY IF EXISTS "guru_select_policy" ON guru;
DROP POLICY IF EXISTS "guru_insert_policy" ON guru;
DROP POLICY IF EXISTS "guru_update_policy" ON guru;
DROP POLICY IF EXISTS "guru_delete_policy" ON guru;

-- Kelas
DROP POLICY IF EXISTS "kelas_select_policy" ON kelas;
DROP POLICY IF EXISTS "kelas_insert_policy" ON kelas;
DROP POLICY IF EXISTS "kelas_update_policy" ON kelas;
DROP POLICY IF EXISTS "kelas_delete_policy" ON kelas;

-- Halaqoh
DROP POLICY IF EXISTS "halaqoh_select_policy" ON halaqoh;
DROP POLICY IF EXISTS "halaqoh_insert_policy" ON halaqoh;
DROP POLICY IF EXISTS "halaqoh_update_policy" ON halaqoh;
DROP POLICY IF EXISTS "halaqoh_delete_policy" ON halaqoh;

-- Hafalan
DROP POLICY IF EXISTS "hafalan_select_policy" ON hafalan;
DROP POLICY IF EXISTS "hafalan_insert_policy" ON hafalan;
DROP POLICY IF EXISTS "hafalan_update_policy" ON hafalan;
DROP POLICY IF EXISTS "hafalan_delete_policy" ON hafalan;

-- Presensi
DROP POLICY IF EXISTS "presensi_select_policy" ON presensi;
DROP POLICY IF EXISTS "presensi_insert_policy" ON presensi;
DROP POLICY IF EXISTS "presensi_update_policy" ON presensi;
DROP POLICY IF EXISTS "presensi_delete_policy" ON presensi;

-- Nilai
DROP POLICY IF EXISTS "nilai_select_policy" ON nilai;
DROP POLICY IF EXISTS "nilai_insert_policy" ON nilai;
DROP POLICY IF EXISTS "nilai_update_policy" ON nilai;
DROP POLICY IF EXISTS "nilai_delete_policy" ON nilai;

-- Mapel
DROP POLICY IF EXISTS "mapel_select_policy" ON mapel;
DROP POLICY IF EXISTS "mapel_insert_policy" ON mapel;
DROP POLICY IF EXISTS "mapel_update_policy" ON mapel;
DROP POLICY IF EXISTS "mapel_delete_policy" ON mapel;

-- Semester
DROP POLICY IF EXISTS "semester_select_policy" ON semester;
DROP POLICY IF EXISTS "semester_all_policy" ON semester;

-- Audit Log
DROP POLICY IF EXISTS "audit_log_select_policy" ON audit_log;
DROP POLICY IF EXISTS "audit_log_insert_policy" ON audit_log;

-- =====================================================
-- 4. SANTRI POLICIES
-- =====================================================
-- Admin: Full access
-- Guru: Read all, Update (tidak bisa delete)
-- Wali: Read ONLY santri yang terhubung

-- SELECT: Admin & Guru = all, Wali = only connected santri
CREATE POLICY "santri_select_policy" ON santri
FOR SELECT USING (
    CASE get_user_role()
        WHEN 'admin' THEN true
        WHEN 'guru' THEN true
        WHEN 'wali' THEN id = ANY(get_wali_santri_ids())
        ELSE false
    END
);

-- INSERT: Only admin
CREATE POLICY "santri_insert_policy" ON santri
FOR INSERT WITH CHECK (is_admin());

-- UPDATE: Admin full, Guru bisa update
CREATE POLICY "santri_update_policy" ON santri
FOR UPDATE USING (is_admin_or_guru());

-- DELETE: Only admin
CREATE POLICY "santri_delete_policy" ON santri
FOR DELETE USING (is_admin());

-- =====================================================
-- 5. GURU POLICIES
-- =====================================================
-- Admin: Full access
-- Guru: Read all (untuk dropdown, dll)
-- Wali: Read all (untuk lihat nama pengajar)

-- SELECT: All authenticated users can read
CREATE POLICY "guru_select_policy" ON guru
FOR SELECT USING (auth.uid() IS NOT NULL);

-- INSERT: Only admin
CREATE POLICY "guru_insert_policy" ON guru
FOR INSERT WITH CHECK (is_admin());

-- UPDATE: Only admin
CREATE POLICY "guru_update_policy" ON guru
FOR UPDATE USING (is_admin());

-- DELETE: Only admin
CREATE POLICY "guru_delete_policy" ON guru
FOR DELETE USING (is_admin());

-- =====================================================
-- 6. KELAS POLICIES
-- =====================================================

-- SELECT: All authenticated users
CREATE POLICY "kelas_select_policy" ON kelas
FOR SELECT USING (auth.uid() IS NOT NULL);

-- INSERT: Only admin
CREATE POLICY "kelas_insert_policy" ON kelas
FOR INSERT WITH CHECK (is_admin());

-- UPDATE: Admin only
CREATE POLICY "kelas_update_policy" ON kelas
FOR UPDATE USING (is_admin());

-- DELETE: Admin only
CREATE POLICY "kelas_delete_policy" ON kelas
FOR DELETE USING (is_admin());

-- =====================================================
-- 7. HALAQOH POLICIES
-- =====================================================

-- SELECT: All authenticated users
CREATE POLICY "halaqoh_select_policy" ON halaqoh
FOR SELECT USING (auth.uid() IS NOT NULL);

-- INSERT: Admin only
CREATE POLICY "halaqoh_insert_policy" ON halaqoh
FOR INSERT WITH CHECK (is_admin());

-- UPDATE: Admin only
CREATE POLICY "halaqoh_update_policy" ON halaqoh
FOR UPDATE USING (is_admin());

-- DELETE: Admin only
CREATE POLICY "halaqoh_delete_policy" ON halaqoh
FOR DELETE USING (is_admin());

-- =====================================================
-- 8. HAFALAN POLICIES
-- =====================================================
-- Admin: Full access
-- Guru: Read all, Insert/Update (untuk input hafalan)
-- Wali: Read ONLY hafalan santri yang terhubung

-- SELECT
CREATE POLICY "hafalan_select_policy" ON hafalan
FOR SELECT USING (
    CASE get_user_role()
        WHEN 'admin' THEN true
        WHEN 'guru' THEN true
        WHEN 'wali' THEN santri_id = ANY(get_wali_santri_ids())
        ELSE false
    END
);

-- INSERT: Admin & Guru
CREATE POLICY "hafalan_insert_policy" ON hafalan
FOR INSERT WITH CHECK (is_admin_or_guru());

-- UPDATE: Admin & Guru
CREATE POLICY "hafalan_update_policy" ON hafalan
FOR UPDATE USING (is_admin_or_guru());

-- DELETE: Admin only
CREATE POLICY "hafalan_delete_policy" ON hafalan
FOR DELETE USING (is_admin());

-- =====================================================
-- 9. PRESENSI POLICIES
-- =====================================================

-- SELECT
CREATE POLICY "presensi_select_policy" ON presensi
FOR SELECT USING (
    CASE get_user_role()
        WHEN 'admin' THEN true
        WHEN 'guru' THEN true
        WHEN 'wali' THEN santri_id = ANY(get_wali_santri_ids())
        ELSE false
    END
);

-- INSERT: Admin & Guru
CREATE POLICY "presensi_insert_policy" ON presensi
FOR INSERT WITH CHECK (is_admin_or_guru());

-- UPDATE: Admin & Guru
CREATE POLICY "presensi_update_policy" ON presensi
FOR UPDATE USING (is_admin_or_guru());

-- DELETE: Admin only
CREATE POLICY "presensi_delete_policy" ON presensi
FOR DELETE USING (is_admin());

-- =====================================================
-- 10. NILAI POLICIES
-- =====================================================

-- SELECT
CREATE POLICY "nilai_select_policy" ON nilai
FOR SELECT USING (
    CASE get_user_role()
        WHEN 'admin' THEN true
        WHEN 'guru' THEN true
        WHEN 'wali' THEN santri_id = ANY(get_wali_santri_ids())
        ELSE false
    END
);

-- INSERT: Admin & Guru
CREATE POLICY "nilai_insert_policy" ON nilai
FOR INSERT WITH CHECK (is_admin_or_guru());

-- UPDATE: Admin & Guru
CREATE POLICY "nilai_update_policy" ON nilai
FOR UPDATE USING (is_admin_or_guru());

-- DELETE: Admin only
CREATE POLICY "nilai_delete_policy" ON nilai
FOR DELETE USING (is_admin());

-- =====================================================
-- 11. MAPEL POLICIES
-- =====================================================

-- SELECT: All authenticated
CREATE POLICY "mapel_select_policy" ON mapel
FOR SELECT USING (auth.uid() IS NOT NULL);

-- INSERT: Admin only
CREATE POLICY "mapel_insert_policy" ON mapel
FOR INSERT WITH CHECK (is_admin());

-- UPDATE: Admin only
CREATE POLICY "mapel_update_policy" ON mapel
FOR UPDATE USING (is_admin());

-- DELETE: Admin only
CREATE POLICY "mapel_delete_policy" ON mapel
FOR DELETE USING (is_admin());

-- =====================================================
-- 12. SEMESTER POLICIES
-- =====================================================

-- SELECT: All authenticated
CREATE POLICY "semester_select_policy" ON semester
FOR SELECT USING (auth.uid() IS NOT NULL);

-- ALL: Admin only
CREATE POLICY "semester_all_policy" ON semester
FOR ALL USING (is_admin());

-- =====================================================
-- 13. AUDIT LOG POLICIES
-- =====================================================

-- SELECT: Admin only (for security)
CREATE POLICY "audit_log_select_policy" ON audit_log
FOR SELECT USING (is_admin());

-- INSERT: All authenticated (system can log)
CREATE POLICY "audit_log_insert_policy" ON audit_log
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- 14. USER_PROFILES POLICIES (Update)
-- =====================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Allow all access" ON user_profiles;

-- Users can read all profiles (untuk lookup)
CREATE POLICY "user_profiles_select_policy" ON user_profiles
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can only update their own profile
CREATE POLICY "user_profiles_update_policy" ON user_profiles
FOR UPDATE USING (user_id = auth.uid());

-- Admin can insert new profiles
CREATE POLICY "user_profiles_insert_policy" ON user_profiles
FOR INSERT WITH CHECK (is_admin() OR auth.uid() IS NOT NULL);

-- Admin can delete profiles
CREATE POLICY "user_profiles_delete_policy" ON user_profiles
FOR DELETE USING (is_admin());

-- =====================================================
-- 15. OPTIONAL: PENCAPAIAN_HAFALAN POLICIES
-- =====================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pencapaian_hafalan') THEN
        -- Drop existing
        DROP POLICY IF EXISTS "pencapaian_hafalan_select_policy" ON pencapaian_hafalan;
        DROP POLICY IF EXISTS "pencapaian_hafalan_insert_policy" ON pencapaian_hafalan;
        DROP POLICY IF EXISTS "pencapaian_hafalan_update_policy" ON pencapaian_hafalan;
        DROP POLICY IF EXISTS "pencapaian_hafalan_delete_policy" ON pencapaian_hafalan;
        
        -- Create policies
        CREATE POLICY "pencapaian_hafalan_select_policy" ON pencapaian_hafalan
        FOR SELECT USING (
            CASE get_user_role()
                WHEN 'admin' THEN true
                WHEN 'guru' THEN true
                WHEN 'wali' THEN santri_id = ANY(get_wali_santri_ids())
                ELSE false
            END
        );
        
        CREATE POLICY "pencapaian_hafalan_insert_policy" ON pencapaian_hafalan
        FOR INSERT WITH CHECK (is_admin_or_guru());
        
        CREATE POLICY "pencapaian_hafalan_update_policy" ON pencapaian_hafalan
        FOR UPDATE USING (is_admin_or_guru());
        
        CREATE POLICY "pencapaian_hafalan_delete_policy" ON pencapaian_hafalan
        FOR DELETE USING (is_admin());
    END IF;
END $$;

-- =====================================================
-- 16. OPTIONAL: PERILAKU_SANTRI POLICIES
-- =====================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'perilaku_santri') THEN
        DROP POLICY IF EXISTS "perilaku_santri_select_policy" ON perilaku_santri;
        DROP POLICY IF EXISTS "perilaku_santri_insert_policy" ON perilaku_santri;
        DROP POLICY IF EXISTS "perilaku_santri_update_policy" ON perilaku_santri;
        DROP POLICY IF EXISTS "perilaku_santri_delete_policy" ON perilaku_santri;
        
        CREATE POLICY "perilaku_santri_select_policy" ON perilaku_santri
        FOR SELECT USING (
            CASE get_user_role()
                WHEN 'admin' THEN true
                WHEN 'guru' THEN true
                WHEN 'wali' THEN santri_id = ANY(get_wali_santri_ids())
                ELSE false
            END
        );
        
        CREATE POLICY "perilaku_santri_insert_policy" ON perilaku_santri
        FOR INSERT WITH CHECK (is_admin_or_guru());
        
        CREATE POLICY "perilaku_santri_update_policy" ON perilaku_santri
        FOR UPDATE USING (is_admin_or_guru());
        
        CREATE POLICY "perilaku_santri_delete_policy" ON perilaku_santri
        FOR DELETE USING (is_admin());
    END IF;
END $$;

-- =====================================================
-- 17. OPTIONAL: TAUJIHAD POLICIES
-- =====================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'taujihad') THEN
        DROP POLICY IF EXISTS "taujihad_select_policy" ON taujihad;
        DROP POLICY IF EXISTS "taujihad_insert_policy" ON taujihad;
        DROP POLICY IF EXISTS "taujihad_update_policy" ON taujihad;
        DROP POLICY IF EXISTS "taujihad_delete_policy" ON taujihad;
        
        CREATE POLICY "taujihad_select_policy" ON taujihad
        FOR SELECT USING (
            CASE get_user_role()
                WHEN 'admin' THEN true
                WHEN 'guru' THEN true
                WHEN 'wali' THEN santri_id = ANY(get_wali_santri_ids())
                ELSE false
            END
        );
        
        CREATE POLICY "taujihad_insert_policy" ON taujihad
        FOR INSERT WITH CHECK (is_admin_or_guru());
        
        CREATE POLICY "taujihad_update_policy" ON taujihad
        FOR UPDATE USING (is_admin_or_guru());
        
        CREATE POLICY "taujihad_delete_policy" ON taujihad
        FOR DELETE USING (is_admin());
    END IF;
END $$;

-- =====================================================
-- 18. GRANT PERMISSIONS
-- =====================================================

-- Grant usage on functions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION get_wali_santri_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_guru_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_or_guru() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- =====================================================
-- 19. VERIFICATION QUERIES
-- =====================================================

-- Check RLS is enabled on all tables
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('santri', 'guru', 'kelas', 'halaqoh', 'hafalan', 'presensi', 'nilai', 'mapel', 'semester', 'user_profiles');

-- Check policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- 20. TEST QUERIES (Run these to verify)
-- =====================================================

-- Test as current user
-- SELECT get_user_role();
-- SELECT get_wali_santri_ids();

-- Test santri access (should work based on role)
-- SELECT * FROM santri LIMIT 5;

-- Test hafalan access
-- SELECT * FROM hafalan LIMIT 5;

-- =====================================================
-- ROLLBACK (If needed)
-- =====================================================
-- To disable RLS on a table:
-- ALTER TABLE santri DISABLE ROW LEVEL SECURITY;
-- 
-- To drop all policies on a table:
-- DROP POLICY IF EXISTS "santri_select_policy" ON santri;
-- (repeat for all policies)
