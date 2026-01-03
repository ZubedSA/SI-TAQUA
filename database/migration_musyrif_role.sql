-- ============================================================================
-- MIGRATION: MUSYRIF ROLE SYSTEM
-- ============================================================================
-- Versi: 1.0
-- Tanggal: 3 Januari 2026
-- Deskripsi: Menambahkan role MUSYRIF dengan akses READ-ONLY ke Dashboard Akademik
--            Akses data difilter berdasarkan halaqoh yang ditugaskan
-- ============================================================================
-- 
-- JALANKAN FILE INI DI SUPABASE DASHBOARD → SQL EDITOR
-- 
-- ============================================================================

-- ============================================================================
-- LANGKAH 1: BUAT TABEL RELASI MUSYRIF ↔ HALAQOH
-- ============================================================================
-- Tabel ini menyimpan relasi many-to-many antara user (musyrif) dan halaqoh
-- Satu musyrif bisa ditugaskan ke beberapa halaqoh

CREATE TABLE IF NOT EXISTS musyrif_halaqoh (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    halaqoh_id UUID NOT NULL REFERENCES halaqoh(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, halaqoh_id)
);

-- Indexes untuk performa query
CREATE INDEX IF NOT EXISTS idx_musyrif_halaqoh_user ON musyrif_halaqoh(user_id);
CREATE INDEX IF NOT EXISTS idx_musyrif_halaqoh_halaqoh ON musyrif_halaqoh(halaqoh_id);

SELECT '✅ LANGKAH 1 SELESAI: Tabel musyrif_halaqoh sudah dibuat' as status;

-- ============================================================================
-- LANGKAH 2: ENABLE RLS UNTUK musyrif_halaqoh
-- ============================================================================

ALTER TABLE musyrif_halaqoh ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama jika ada
DROP POLICY IF EXISTS "musyrif_halaqoh_select_all" ON musyrif_halaqoh;
DROP POLICY IF EXISTS "musyrif_halaqoh_admin_insert" ON musyrif_halaqoh;
DROP POLICY IF EXISTS "musyrif_halaqoh_admin_update" ON musyrif_halaqoh;
DROP POLICY IF EXISTS "musyrif_halaqoh_admin_delete" ON musyrif_halaqoh;
DROP POLICY IF EXISTS "service_role_all" ON musyrif_halaqoh;

-- Policy SELECT: Semua authenticated user bisa lihat (untuk filter data di frontend)
CREATE POLICY "musyrif_halaqoh_select_all" ON musyrif_halaqoh
FOR SELECT TO authenticated
USING (true);

-- Policy INSERT: Hanya admin yang bisa insert
CREATE POLICY "musyrif_halaqoh_admin_insert" ON musyrif_halaqoh
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND (role = 'admin' OR 'admin' = ANY(roles))
    )
);

-- Policy UPDATE: Hanya admin yang bisa update
CREATE POLICY "musyrif_halaqoh_admin_update" ON musyrif_halaqoh
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND (role = 'admin' OR 'admin' = ANY(roles))
    )
);

-- Policy DELETE: Hanya admin yang bisa delete
CREATE POLICY "musyrif_halaqoh_admin_delete" ON musyrif_halaqoh
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND (role = 'admin' OR 'admin' = ANY(roles))
    )
);

-- Service role bypass
CREATE POLICY "service_role_all" ON musyrif_halaqoh
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

SELECT '✅ LANGKAH 2 SELESAI: RLS policies untuk musyrif_halaqoh sudah dibuat' as status;

-- ============================================================================
-- LANGKAH 3: HELPER FUNCTION - GET HALAQOH IDS FOR MUSYRIF
-- ============================================================================
-- Function untuk mendapatkan halaqoh_ids yang ditugaskan ke musyrif

DROP FUNCTION IF EXISTS get_musyrif_halaqoh_ids(UUID);

CREATE OR REPLACE FUNCTION get_musyrif_halaqoh_ids(p_user_id UUID)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    v_halaqoh_ids UUID[];
BEGIN
    SELECT ARRAY_AGG(halaqoh_id) INTO v_halaqoh_ids
    FROM musyrif_halaqoh
    WHERE user_id = p_user_id;
    
    RETURN COALESCE(v_halaqoh_ids, ARRAY[]::UUID[]);
END;
$$;

GRANT EXECUTE ON FUNCTION get_musyrif_halaqoh_ids(UUID) TO authenticated;

SELECT '✅ LANGKAH 3 SELESAI: Function get_musyrif_halaqoh_ids sudah dibuat' as status;

-- ============================================================================
-- LANGKAH 4: CHECK IF CURRENT USER IS MUSYRIF
-- ============================================================================

DROP FUNCTION IF EXISTS is_musyrif();

CREATE OR REPLACE FUNCTION is_musyrif()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND (role = 'musyrif' OR active_role = 'musyrif' OR 'musyrif' = ANY(roles))
    );
$$;

GRANT EXECUTE ON FUNCTION is_musyrif() TO authenticated;

SELECT '✅ LANGKAH 4 SELESAI: Function is_musyrif sudah dibuat' as status;

-- ============================================================================
-- LANGKAH 5: HELPER FUNCTION - CHECK SANTRI ACCESS FOR MUSYRIF
-- ============================================================================
-- Function untuk cek apakah musyrif bisa akses santri tertentu

DROP FUNCTION IF EXISTS can_musyrif_access_santri(UUID);

CREATE OR REPLACE FUNCTION can_musyrif_access_santri(p_santri_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    v_santri_halaqoh UUID;
    v_musyrif_halaqoh UUID[];
BEGIN
    -- Jika bukan musyrif, return true (tidak dibatasi)
    IF NOT is_musyrif() THEN
        RETURN TRUE;
    END IF;
    
    -- Dapatkan halaqoh_id santri
    SELECT halaqoh_id INTO v_santri_halaqoh
    FROM santri
    WHERE id = p_santri_id;
    
    -- Jika santri tidak punya halaqoh, musyrif tidak bisa akses
    IF v_santri_halaqoh IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Dapatkan halaqoh yang bisa diakses musyrif
    v_musyrif_halaqoh := get_musyrif_halaqoh_ids(auth.uid());
    
    -- Cek apakah halaqoh santri ada di list halaqoh musyrif
    RETURN v_santri_halaqoh = ANY(v_musyrif_halaqoh);
END;
$$;

GRANT EXECUTE ON FUNCTION can_musyrif_access_santri(UUID) TO authenticated;

SELECT '✅ LANGKAH 5 SELESAI: Function can_musyrif_access_santri sudah dibuat' as status;

-- ============================================================================
-- VERIFIKASI AKHIR
-- ============================================================================

SELECT '========================================' as separator;
SELECT '✅ MIGRATION MUSYRIF ROLE SELESAI!' as status;
SELECT '========================================' as separator;

-- Cek tabel
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'musyrif_halaqoh')
        THEN '✅ Tabel musyrif_halaqoh tersedia'
        ELSE '❌ Tabel musyrif_halaqoh TIDAK tersedia'
    END as table_status;

-- Cek functions
SELECT 
    routine_name as function_name,
    '✅ Tersedia' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_musyrif_halaqoh_ids',
    'is_musyrif',
    'can_musyrif_access_santri'
)
ORDER BY routine_name;

SELECT '========================================' as separator;
SELECT 'Langkah selanjutnya: Update frontend untuk role musyrif' as next_step;
