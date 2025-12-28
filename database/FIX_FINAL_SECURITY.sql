-- =====================================================
-- FIX FINAL SECURITY (STRICT RLS ENFORCEMENT)
-- Tanggal: 2025-12-29
-- Deskripsi: Menerapkan keamanan tingkat database yang ketat untuk semua role.
-- =====================================================

-- 1. CLEANUP & HELPER FUNCTION (Ensure Clean State)
-- =====================================================
DROP FUNCTION IF EXISTS get_current_user_role() CASCADE;

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

DROP FUNCTION IF EXISTS get_my_santri_ids() CASCADE;

CREATE OR REPLACE FUNCTION get_my_santri_ids()
RETURNS TABLE (santri_id UUID) AS $$
BEGIN
    RETURN QUERY SELECT id FROM santri WHERE wali_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper untuk drop policy (Safe Drop)
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'santri', 'guru', 'kelas', 'mapel', 'halaqoh', 'semester', 
        'hafalan', 'nilai', 'presensi', 'pencapaian_hafalan', 'taujihad',
        'kas_pemasukan', 'kas_pengeluaran', 'anggaran', 'realisasi_dana', 'kategori_pembayaran', 'tagihan_santri', 'pembayaran_santri'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "select_policy" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "insert_policy" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "update_policy" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "delete_policy" ON %I', t);
        -- Drop legacy policies named differently
        EXECUTE format('DROP POLICY IF EXISTS "Allow read for authenticated" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "santri_select_strict" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "santri_modify_admin" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "santri_update_guru" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "hafalan_modify_staff" ON %I', t);
        
        -- Enable RLS
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;


-- 2. DATA PONDOK (MASTER DATA)
-- =====================================================
-- Rule: Admin (Full), Guru/Bendahara/Pengasuh (Read Only), Wali (Read Partial)

-- SANTRI
CREATE POLICY "select_policy" ON santri FOR SELECT USING (
    get_current_user_role() IN ('admin', 'guru', 'bendahara', 'pengasuh') OR
    (get_current_user_role() = 'wali' AND wali_id = auth.uid()) OR
    (get_current_user_role() = 'santri' AND id = (SELECT santri_id FROM user_profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "insert_policy" ON santri FOR INSERT WITH CHECK (get_current_user_role() = 'admin');
CREATE POLICY "update_policy" ON santri FOR UPDATE USING (get_current_user_role() = 'admin');
CREATE POLICY "delete_policy" ON santri FOR DELETE USING (get_current_user_role() = 'admin');

-- GURU, KELAS, MAPEL, HALAQOH, SEMESTER (Master Data Umum)
-- Guru/Bendahara need to SELECT to display lists.
DO $$
DECLARE
    t text;
    master_tables text[] := ARRAY['guru', 'kelas', 'mapel', 'halaqoh', 'semester'];
BEGIN
    FOREACH t IN ARRAY master_tables LOOP
        EXECUTE format('CREATE POLICY "select_policy" ON %I FOR SELECT USING (get_current_user_role() IN (''admin'', ''guru'', ''bendahara'', ''pengasuh'', ''wali''))', t);
        EXECUTE format('CREATE POLICY "insert_policy" ON %I FOR INSERT WITH CHECK (get_current_user_role() = ''admin'')', t);
        EXECUTE format('CREATE POLICY "update_policy" ON %I FOR UPDATE USING (get_current_user_role() = ''admin'')', t);
        EXECUTE format('CREATE POLICY "delete_policy" ON %I FOR DELETE USING (get_current_user_role() = ''admin'')', t);
    END LOOP;
END $$;


-- 3. AKADEMIK (Hafalan, Nilai, Presensi)
-- =====================================================
-- Rule: Admin/Guru (Full), Wali/Santri (Read Own), Bendahara/Pengasuh (Read Only - maybe for reporting?)

-- HAFALAN
CREATE POLICY "select_policy" ON hafalan FOR SELECT USING (
    get_current_user_role() IN ('admin', 'guru') OR
    (get_current_user_role() = 'wali' AND santri_id IN (SELECT santri_id FROM get_my_santri_ids())) OR
    (get_current_user_role() = 'santri' AND santri_id = (SELECT santri_id FROM user_profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "insert_policy" ON hafalan FOR INSERT WITH CHECK (get_current_user_role() IN ('admin', 'guru'));
CREATE POLICY "update_policy" ON hafalan FOR UPDATE USING (get_current_user_role() IN ('admin', 'guru'));
CREATE POLICY "delete_policy" ON hafalan FOR DELETE USING (get_current_user_role() IN ('admin', 'guru'));

-- NILAI (Mirror Hafalan)
CREATE POLICY "select_policy" ON nilai FOR SELECT USING (
    get_current_user_role() IN ('admin', 'guru') OR
    (get_current_user_role() = 'wali' AND santri_id IN (SELECT santri_id FROM get_my_santri_ids())) OR
    (get_current_user_role() = 'santri' AND santri_id = (SELECT santri_id FROM user_profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "insert_policy" ON nilai FOR INSERT WITH CHECK (get_current_user_role() IN ('admin', 'guru'));
CREATE POLICY "update_policy" ON nilai FOR UPDATE USING (get_current_user_role() IN ('admin', 'guru'));
CREATE POLICY "delete_policy" ON nilai FOR DELETE USING (get_current_user_role() IN ('admin', 'guru'));

-- PRESENSI & EXTRA TABLES (Mirror Hafalan)
DO $$
DECLARE
    t text;
    akademik_tables text[] := ARRAY['presensi', 'pencapaian_hafalan', 'taujihad'];
BEGIN
    FOREACH t IN ARRAY akademik_tables LOOP
        EXECUTE format('CREATE POLICY "select_policy" ON %I FOR SELECT USING (
            get_current_user_role() IN (''admin'', ''guru'', ''bendahara'', ''pengasuh'') OR
            (get_current_user_role() = ''wali'' AND santri_id IN (SELECT santri_id FROM get_my_santri_ids()))
        )', t);
        EXECUTE format('CREATE POLICY "insert_policy" ON %I FOR INSERT WITH CHECK (get_current_user_role() IN (''admin'', ''guru''))', t);
        EXECUTE format('CREATE POLICY "update_policy" ON %I FOR UPDATE USING (get_current_user_role() IN (''admin'', ''guru''))', t);
        EXECUTE format('CREATE POLICY "delete_policy" ON %I FOR DELETE USING (get_current_user_role() IN (''admin'', ''guru''))', t);
    END LOOP;
END $$;


-- 4. KEUANGAN (KAS, ANGGARAN, REALISASI)
-- =====================================================
-- Rule: Admin/Bendahara (Full), Pengasuh (Read Only). Guru/Wali/Santri (NO ACCESS or Very Limited)

-- KAS (Pemasukan/Pengeluaran), ANGGARAN, REALISASI, KATEGORI
DO $$
DECLARE
    t text;
    keuangan_tables text[] := ARRAY['kas_pemasukan', 'kas_pengeluaran', 'anggaran', 'realisasi_dana', 'kategori_pembayaran'];
BEGIN
    FOREACH t IN ARRAY keuangan_tables LOOP
        -- Read: Admin, Bendahara, Pengasuh. (Wali/Guru NO ACCESS to internal cash flow)
        EXECUTE format('CREATE POLICY "select_policy" ON %I FOR SELECT USING (get_current_user_role() IN (''admin'', ''bendahara'', ''pengasuh''))', t);
        -- Write: Admin, Bendahara
        EXECUTE format('CREATE POLICY "insert_policy" ON %I FOR INSERT WITH CHECK (get_current_user_role() IN (''admin'', ''bendahara''))', t);
        EXECUTE format('CREATE POLICY "update_policy" ON %I FOR UPDATE USING (get_current_user_role() IN (''admin'', ''bendahara''))', t);
        EXECUTE format('CREATE POLICY "delete_policy" ON %I FOR DELETE USING (get_current_user_role() IN (''admin'', ''bendahara''))', t);
    END LOOP;
END $$;


-- 5. KEUANGAN SANTRI (Tagihan, Pembayaran)
-- =====================================================
-- Rule: Admin/Bendahara (Full), Pengasuh (Read), Wali (Read Own), Santri (Read Own)

-- TAGIHAN SANTRI
CREATE POLICY "select_policy" ON tagihan_santri FOR SELECT USING (
    get_current_user_role() IN ('admin', 'bendahara', 'pengasuh') OR
    (get_current_user_role() = 'wali' AND santri_id IN (SELECT santri_id FROM get_my_santri_ids())) OR
    (get_current_user_role() = 'santri' AND santri_id = (SELECT santri_id FROM user_profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "insert_policy" ON tagihan_santri FOR INSERT WITH CHECK (get_current_user_role() IN ('admin', 'bendahara'));
CREATE POLICY "update_policy" ON tagihan_santri FOR UPDATE USING (get_current_user_role() IN ('admin', 'bendahara'));
CREATE POLICY "delete_policy" ON tagihan_santri FOR DELETE USING (get_current_user_role() IN ('admin', 'bendahara'));

-- PEMBAYARAN SANTRI
CREATE POLICY "select_policy" ON pembayaran_santri FOR SELECT USING (
    get_current_user_role() IN ('admin', 'bendahara', 'pengasuh') OR
    (get_current_user_role() = 'wali' AND santri_id IN (SELECT santri_id FROM get_my_santri_ids())) OR
    (get_current_user_role() = 'santri' AND santri_id = (SELECT santri_id FROM user_profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "insert_policy" ON pembayaran_santri FOR INSERT WITH CHECK (get_current_user_role() IN ('admin', 'bendahara'));
CREATE POLICY "update_policy" ON pembayaran_santri FOR UPDATE USING (get_current_user_role() IN ('admin', 'bendahara'));
CREATE POLICY "delete_policy" ON pembayaran_santri FOR DELETE USING (get_current_user_role() IN ('admin', 'bendahara'));


-- =====================================================
-- SELESAI
-- =====================================================
