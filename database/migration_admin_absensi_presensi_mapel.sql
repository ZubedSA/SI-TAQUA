-- =====================================================
-- MIGRATION: GRANT FULL ACCESS TO presensi_mapel TABLES
-- =====================================================
-- Purpose: Allow admin_absensi role to INSERT and UPDATE
-- teaching journals (agenda mengajar) and attendance details.
-- =====================================================

BEGIN;

-- =========================================================
-- 1. PRESENSI_MAPEL - Subject Attendance (Header)
-- =========================================================

-- Drop existing policies if they might conflict
DROP POLICY IF EXISTS "presensi_mapel_select_admin_absensi" ON public.presensi_mapel;
DROP POLICY IF EXISTS "presensi_mapel_all_staff" ON public.presensi_mapel;
DROP POLICY IF EXISTS "presensi_mapel_full_access_admin_absensi" ON public.presensi_mapel;

CREATE POLICY "presensi_mapel_full_access_admin_absensi" 
ON public.presensi_mapel FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND (
            'admin' = ANY(user_profiles.roles) OR
            'admin_absensi' = ANY(user_profiles.roles) OR
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
            'admin_absensi' = ANY(user_profiles.roles) OR
            'guru' = ANY(user_profiles.roles) OR
            'musyrif' = ANY(user_profiles.roles)
        )
    )
);


-- =========================================================
-- 2. PRESENSI_MAPEL_DETIL - Detail Attendance (Santri)
-- =========================================================

DROP POLICY IF EXISTS "presensi_mapel_detil_select_admin_absensi" ON public.presensi_mapel_detil;
DROP POLICY IF EXISTS "presensi_mapel_detil_all_staff" ON public.presensi_mapel_detil;
DROP POLICY IF EXISTS "presensi_mapel_detil_full_access_admin_absensi" ON public.presensi_mapel_detil;

CREATE POLICY "presensi_mapel_detil_full_access_admin_absensi" 
ON public.presensi_mapel_detil FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND (
            'admin' = ANY(user_profiles.roles) OR
            'admin_absensi' = ANY(user_profiles.roles) OR
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
            'admin_absensi' = ANY(user_profiles.roles) OR
            'guru' = ANY(user_profiles.roles) OR
            'musyrif' = ANY(user_profiles.roles)
        )
    )
);

COMMIT;

SELECT '✅ Migration presensi_mapel RLS berhasil! Role admin_absensi sekarang memiliki akses penuh untuk mengisi dan mengubah jurnal.' as status;
