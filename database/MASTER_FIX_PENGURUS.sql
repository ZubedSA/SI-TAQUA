-- =============================================
-- MASTER FIX: PENGURUS & USER PROFILES (NUCLEAR VERSION)
-- =============================================

BEGIN;

-- Add sanksi column if not exists
ALTER TABLE public.pelanggaran ADD COLUMN IF NOT EXISTS sanksi TEXT;

-- =============================================
-- 1. FIX HELPER FUNCTIONS (ANTI-LOOP & SECURITY DEFINER)
-- =============================================

CREATE OR REPLACE FUNCTION is_staff_safe()
RETURNS BOOLEAN AS $$
DECLARE
    is_staff BOOLEAN;
BEGIN
    -- SECURITY DEFINER bypasses RLS, so this won't loop.
    SELECT EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND (
            role IN ('admin', 'pengurus', 'guru', 'musyrif') OR
            'admin' = ANY(roles) OR
            'pengurus' = ANY(roles) OR
            'guru' = ANY(roles) OR
            'musyrif' = ANY(roles)
        )
    ) INTO is_staff;
    
    RETURN COALESCE(is_staff, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_staff_safe() TO authenticated;

-- =============================================
-- 2. RESET POLICIES - USER_PROFILES (FORCE CLEANUP)
-- =============================================

ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- NUCLEAR DROP: Hapus SEMUA policy yang ada di user_profiles tanpa terkecuali
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles') 
    LOOP 
        EXECUTE format('DROP POLICY %I ON user_profiles', pol.policyname); 
    END LOOP; 
END $$;

-- Buat ulang policy yang bersih
CREATE POLICY "user_profiles_read_all" ON user_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_profiles_update_self" ON user_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_profiles_staff_all" ON user_profiles FOR ALL TO authenticated USING (is_staff_safe());

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 3. RESET POLICIES - PELANGGARAN (FORCE CLEANUP)
-- =============================================

ALTER TABLE pelanggaran DISABLE ROW LEVEL SECURITY;

-- NUCLEAR DROP: Hapus SEMUA policy yang ada di pelanggaran
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'pelanggaran') 
    LOOP 
        EXECUTE format('DROP POLICY %I ON pelanggaran', pol.policyname); 
    END LOOP; 
END $$;

-- Buat ulang policy yang bersih
CREATE POLICY "pelanggaran_read_all" ON pelanggaran FOR SELECT TO authenticated USING (true);
CREATE POLICY "pelanggaran_staff_manage" ON pelanggaran FOR ALL TO authenticated USING (is_staff_safe()) WITH CHECK (is_staff_safe());

ALTER TABLE pelanggaran ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. RECREATE VIEW - SANTRI_BERMASALAH (Fix Table vs View)
-- =============================================

DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'santri_bermasalah') THEN
        DROP VIEW public.santri_bermasalah CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'santri_bermasalah' AND table_type = 'BASE TABLE') THEN
        DROP TABLE public.santri_bermasalah CASCADE;
    END IF;
END $$;

CREATE OR REPLACE VIEW santri_bermasalah AS
SELECT 
    s.id,
    s.nis,
    s.nama,
    s.kelas_id,
    k.nama as kelas_nama,
    h.nama as halaqoh_nama,
    COUNT(p.id) as total_pelanggaran,
    SUM(CASE WHEN p.tingkat >= 3 THEN 1 ELSE 0 END) as pelanggaran_berat,
    SUM(CASE WHEN p.status = 'OPEN' THEN 1 ELSE 0 END) as kasus_open,
    SUM(CASE WHEN p.status = 'PROSES' THEN 1 ELSE 0 END) as kasus_proses,
    SUM(CASE WHEN p.status = 'SELESAI' THEN 1 ELSE 0 END) as kasus_selesai,
    MAX(p.tanggal) as pelanggaran_terakhir,
    ARRAY_AGG(DISTINCT p.tingkat ORDER BY p.tingkat DESC) as tingkat_pelanggaran
FROM santri s
LEFT JOIN kelas k ON k.id = s.kelas_id
LEFT JOIN halaqoh h ON h.id = s.halaqoh_id
JOIN pelanggaran p ON p.santri_id = s.id
WHERE p.tanggal >= CURRENT_DATE - INTERVAL '6 months'
  AND s.status = 'Aktif'
GROUP BY s.id, s.nis, s.nama, s.kelas_id, k.nama, h.nama
HAVING (COUNT(p.id) >= 3 OR SUM(CASE WHEN p.tingkat >= 3 THEN 1 ELSE 0 END) >= 1) 
   AND SUM(CASE WHEN p.status != 'SELESAI' THEN 1 ELSE 0 END) > 0;

-- =============================================
-- 5. FIX AUDIT LOGS
-- =============================================
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'audit_logs') 
    LOOP 
        EXECUTE format('DROP POLICY %I ON audit_logs', pol.policyname); 
    END LOOP; 
END $$;

CREATE POLICY "audit_logs_insert_all" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "audit_logs_read_staff" ON audit_logs FOR SELECT TO authenticated USING (is_staff_safe());
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

COMMIT;

SELECT '✅ Nuclear Master Fix Berhasil!' as status;
