-- =====================================================
-- MIGRATION: ADD admin_absensi ROLE TO RLS POLICIES
-- =====================================================
-- Purpose: Grant admin_absensi full access to all tables
-- used by the AdminAbsensiPage (presensi, presensi_staf,
-- jadwal_pelajaran, guru, santri, kelas, halaqoh, mapel)
-- =====================================================

BEGIN;

-- =========================================================
-- 1. PRESENSI_STAF - Staff Attendance Records
-- =========================================================

-- Drop and recreate SELECT policy to include admin_absensi
DROP POLICY IF EXISTS "Presensi Staf viewable by admin" ON public.presensi_staf;
DROP POLICY IF EXISTS "Presensi Staf viewable by staff or admin" ON public.presensi_staf;
DROP POLICY IF EXISTS "presensi_staf_select_admin_absensi" ON public.presensi_staf;

CREATE POLICY "presensi_staf_select_admin_absensi" 
ON public.presensi_staf FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND (
            role IN ('admin', 'guru', 'admin_absensi') 
            OR 'admin' = ANY(roles) 
            OR 'guru' = ANY(roles)
            OR 'admin_absensi' = ANY(roles)
        )
    )
);

-- Drop and recreate UPDATE policy to include admin_absensi
DROP POLICY IF EXISTS "Presensi Staf updatable by authenticated" ON public.presensi_staf;
DROP POLICY IF EXISTS "presensi_staf_update_admin_absensi" ON public.presensi_staf;

CREATE POLICY "presensi_staf_update_admin_absensi" 
ON public.presensi_staf FOR UPDATE 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND (
            role IN ('admin', 'admin_absensi') 
            OR 'admin' = ANY(roles) 
            OR 'admin_absensi' = ANY(roles)
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND (
            role IN ('admin', 'admin_absensi') 
            OR 'admin' = ANY(roles) 
            OR 'admin_absensi' = ANY(roles)
        )
    )
);

-- Ensure INSERT policy exists (keep open for all authenticated)
DROP POLICY IF EXISTS "Presensi Staf insertable by authenticated" ON public.presensi_staf;
CREATE POLICY "Presensi Staf insertable by authenticated" 
ON public.presensi_staf FOR INSERT 
TO authenticated
WITH CHECK (true);


-- =========================================================
-- 2. PRESENSI - Santri Attendance Records
-- =========================================================

-- Drop existing editable policy and recreate with admin_absensi
DROP POLICY IF EXISTS "Presensi editable by staff" ON public.presensi;
DROP POLICY IF EXISTS "presensi_edit_admin_absensi" ON public.presensi;

CREATE POLICY "presensi_edit_admin_absensi" 
ON public.presensi FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND (
            'admin' = ANY(user_profiles.roles) OR
            'admin_absensi' = ANY(user_profiles.roles) OR
            'guru' = ANY(user_profiles.roles) OR
            'musyrif' = ANY(user_profiles.roles) OR
            'pengasuh' = ANY(user_profiles.roles)
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND (
            'admin' = ANY(user_profiles.roles) OR
            'admin_absensi' = ANY(user_profiles.roles) OR
            'guru' = ANY(user_profiles.roles) OR
            'musyrif' = ANY(user_profiles.roles) OR
            'pengasuh' = ANY(user_profiles.roles)
        )
    )
);

-- Ensure SELECT remains open for all authenticated
DROP POLICY IF EXISTS "Presensi viewable" ON public.presensi;
CREATE POLICY "Presensi viewable" 
ON public.presensi FOR SELECT 
TO authenticated
USING (true);


-- =========================================================
-- 3. JADWAL_PELAJARAN - Schedule Data
-- =========================================================

-- Drop existing editable policy and recreate with admin_absensi
DROP POLICY IF EXISTS "Jadwal editable by staff" ON public.jadwal_pelajaran;
DROP POLICY IF EXISTS "jadwal_edit_admin_absensi" ON public.jadwal_pelajaran;

CREATE POLICY "jadwal_edit_admin_absensi" 
ON public.jadwal_pelajaran FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND (
            'admin' = ANY(user_profiles.roles) OR
            'admin_absensi' = ANY(user_profiles.roles) OR
            'guru' = ANY(user_profiles.roles) OR
            'pengurus' = ANY(user_profiles.roles) OR
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
            'admin_absensi' = ANY(user_profiles.roles) OR
            'guru' = ANY(user_profiles.roles) OR
            'pengurus' = ANY(user_profiles.roles) OR
            'musyrif' = ANY(user_profiles.roles)
        )
    )
);

-- Ensure SELECT remains open
DROP POLICY IF EXISTS "Jadwal viewable by all" ON public.jadwal_pelajaran;
CREATE POLICY "Jadwal viewable by all" 
ON public.jadwal_pelajaran FOR SELECT 
TO authenticated
USING (true);


-- =========================================================
-- 4. GURU - Teacher Data (READ access for admin_absensi)
-- =========================================================

-- Check if guru has RLS, add admin_absensi to SELECT
-- Most tables have open SELECT for authenticated, so this ensures it
DROP POLICY IF EXISTS "guru_select_admin_absensi" ON public.guru;
CREATE POLICY "guru_select_admin_absensi" 
ON public.guru FOR SELECT 
TO authenticated
USING (true);


-- =========================================================
-- 5. SANTRI - Student Data (READ access for admin_absensi)
-- =========================================================

DROP POLICY IF EXISTS "santri_select_admin_absensi" ON public.santri;
CREATE POLICY "santri_select_admin_absensi" 
ON public.santri FOR SELECT 
TO authenticated
USING (true);


-- =========================================================
-- 6. KELAS - Class Data (READ access for admin_absensi)
-- =========================================================

DROP POLICY IF EXISTS "kelas_select_admin_absensi" ON public.kelas;
CREATE POLICY "kelas_select_admin_absensi" 
ON public.kelas FOR SELECT 
TO authenticated
USING (true);


-- =========================================================
-- 7. HALAQOH - Halaqoh Data (READ access for admin_absensi)
-- =========================================================

DROP POLICY IF EXISTS "halaqoh_select_admin_absensi" ON public.halaqoh;
CREATE POLICY "halaqoh_select_admin_absensi" 
ON public.halaqoh FOR SELECT 
TO authenticated
USING (true);


-- =========================================================
-- 8. MAPEL - Subject Data (READ access for admin_absensi)
-- =========================================================

DROP POLICY IF EXISTS "mapel_select_admin_absensi" ON public.mapel;
CREATE POLICY "mapel_select_admin_absensi" 
ON public.mapel FOR SELECT 
TO authenticated
USING (true);


-- =========================================================
-- 9. PRESENSI_MAPEL - Subject Attendance (READ for reports)
-- =========================================================

DROP POLICY IF EXISTS "presensi_mapel_select_admin_absensi" ON public.presensi_mapel;
CREATE POLICY "presensi_mapel_select_admin_absensi" 
ON public.presensi_mapel FOR SELECT 
TO authenticated
USING (true);


-- =========================================================
-- 10. PRESENSI_MAPEL_DETIL - Detail Attendance (READ)
-- =========================================================

DROP POLICY IF EXISTS "presensi_mapel_detil_select_admin_absensi" ON public.presensi_mapel_detil;
CREATE POLICY "presensi_mapel_detil_select_admin_absensi" 
ON public.presensi_mapel_detil FOR SELECT 
TO authenticated
USING (true);


COMMIT;

SELECT '✅ Migration admin_absensi RLS berhasil! Role admin_absensi sekarang memiliki akses penuh ke data absensi.' as status;
