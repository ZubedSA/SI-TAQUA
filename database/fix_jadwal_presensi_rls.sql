-- =============================================
-- FIX RLS POLICIES - JADWAL & PRESENSI
-- =============================================
-- Problem: "permission denied for table users"
-- Cause: RLS policies access auth.users directly which is not allowed from client
-- Solution: Use user_profiles table instead

-- =============================================
-- STEP 1: DROP ALL EXISTING POLICIES
-- =============================================

-- Jadwal Pelajaran
DO $$ BEGIN DROP POLICY IF EXISTS "Jadwal viewable by everyone" ON jadwal_pelajaran; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Jadwal editable by admin" ON jadwal_pelajaran; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Jadwal full access for staff" ON jadwal_pelajaran; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Jadwal insert for staff" ON jadwal_pelajaran; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Presensi Mapel
DO $$ BEGIN DROP POLICY IF EXISTS "Presensi Mapel viewable by authenticated" ON presensi_mapel; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Presensi Mapel insertable by guru/admin" ON presensi_mapel; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Presensi Mapel editable by creator or admin" ON presensi_mapel; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Presensi Mapel Detil
DO $$ BEGIN DROP POLICY IF EXISTS "Presensi Detil viewable by authenticated" ON presensi_mapel_detil; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Presensi Detil editable by guru/admin" ON presensi_mapel_detil; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Presensi Harian
DO $$ BEGIN DROP POLICY IF EXISTS "Presensi viewable by authenticated" ON presensi; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Presensi insertable by guru/admin" ON presensi; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Presensi updatable by guru/admin" ON presensi; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Presensi deletable by admin" ON presensi; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- =============================================
-- STEP 2: ENABLE RLS
-- =============================================
ALTER TABLE jadwal_pelajaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE presensi_mapel ENABLE ROW LEVEL SECURITY;
ALTER TABLE presensi_mapel_detil ENABLE ROW LEVEL SECURITY;
ALTER TABLE presensi ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 3: CREATE NEW POLICIES USING user_profiles
-- =============================================

-- =========== JADWAL PELAJARAN ===========

-- Allow all authenticated to READ
CREATE POLICY "Jadwal viewable by all" 
ON jadwal_pelajaran FOR SELECT 
TO authenticated
USING (true);

-- Allow admin/guru/pengurus to INSERT/UPDATE/DELETE
CREATE POLICY "Jadwal editable by staff" 
ON jadwal_pelajaran FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND (
            'admin' = ANY(user_profiles.roles) OR
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
            'guru' = ANY(user_profiles.roles) OR
            'pengurus' = ANY(user_profiles.roles) OR
            'musyrif' = ANY(user_profiles.roles)
        )
    )
);

-- =========== PRESENSI MAPEL ===========

CREATE POLICY "Presensi Mapel viewable" 
ON presensi_mapel FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Presensi Mapel editable by staff" 
ON presensi_mapel FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND (
            'admin' = ANY(user_profiles.roles) OR
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
            'guru' = ANY(user_profiles.roles) OR
            'musyrif' = ANY(user_profiles.roles)
        )
    )
);

-- =========== PRESENSI MAPEL DETIL ===========

CREATE POLICY "Presensi Detil viewable" 
ON presensi_mapel_detil FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Presensi Detil editable by staff" 
ON presensi_mapel_detil FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND (
            'admin' = ANY(user_profiles.roles) OR
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
            'guru' = ANY(user_profiles.roles) OR
            'musyrif' = ANY(user_profiles.roles)
        )
    )
);

-- =========== PRESENSI HARIAN ===========

CREATE POLICY "Presensi viewable" 
ON presensi FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Presensi editable by staff" 
ON presensi FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND (
            'admin' = ANY(user_profiles.roles) OR
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
            'guru' = ANY(user_profiles.roles) OR
            'musyrif' = ANY(user_profiles.roles) OR
            'pengasuh' = ANY(user_profiles.roles)
        )
    )
);

-- =============================================
-- VERIFY POLICIES
-- =============================================
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('jadwal_pelajaran', 'presensi_mapel', 'presensi_mapel_detil', 'presensi')
ORDER BY tablename, policyname;
