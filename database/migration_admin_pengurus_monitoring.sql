-- =====================================================
-- ADMIN PENGURUS MONITORING - Database Migration
-- Script untuk admin monitoring aktivitas pengurus
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. TABEL AUDIT LOG PENGURUS
-- =====================================================
-- Tabel untuk mencatat semua aktivitas pengurus

CREATE TABLE IF NOT EXISTS public.audit_log_pengurus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pengurus_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    pengurus_nama TEXT,
    action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT')),
    table_name TEXT,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    description TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_audit_log_pengurus_pengurus_id ON audit_log_pengurus(pengurus_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_pengurus_action ON audit_log_pengurus(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_pengurus_created_at ON audit_log_pengurus(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_pengurus_table_name ON audit_log_pengurus(table_name);

-- =====================================================
-- 2. VIEW STATISTIK PENGURUS
-- =====================================================

-- View untuk statistik pelanggaran per pengurus
-- NOTE: Menggunakan pelapor_id (bukan created_by) sesuai struktur tabel pelanggaran
CREATE OR REPLACE VIEW v_statistik_pelanggaran_pengurus AS
SELECT 
    up.user_id AS pengurus_id,
    up.nama AS pengurus_nama,
    up.email,
    COUNT(p.id) AS total_pelanggaran,
    COUNT(CASE WHEN p.tingkat = 1 THEN 1 END) AS total_ringan,
    COUNT(CASE WHEN p.tingkat = 2 THEN 1 END) AS total_sedang,
    COUNT(CASE WHEN p.tingkat >= 3 THEN 1 END) AS total_berat,
    COUNT(CASE WHEN p.status = 'SELESAI' THEN 1 END) AS total_selesai,
    COUNT(CASE WHEN p.status = 'PROSES' THEN 1 END) AS total_proses,
    COUNT(CASE WHEN p.status = 'OPEN' THEN 1 END) AS total_belum,
    MAX(p.created_at) AS last_activity
FROM user_profiles up
LEFT JOIN pelanggaran p ON p.pelapor_id = up.id
WHERE 'pengurus' = ANY(up.roles) OR up.role = 'pengurus'
GROUP BY up.user_id, up.nama, up.email;

-- View untuk aktivitas pengurus (pengumuman, buletin, dsb)
CREATE OR REPLACE VIEW v_aktivitas_pengurus AS
SELECT 
    up.user_id AS pengurus_id,
    up.nama AS pengurus_nama,
    'pelanggaran' AS activity_type,
    COUNT(p.id) AS total_count,
    MAX(p.created_at) AS last_activity
FROM user_profiles up
LEFT JOIN pelanggaran p ON p.pelapor_id = up.id
WHERE 'pengurus' = ANY(up.roles) OR up.role = 'pengurus'
GROUP BY up.user_id, up.nama
UNION ALL
SELECT 
    up.user_id AS pengurus_id,
    up.nama AS pengurus_nama,
    'pengumuman' AS activity_type,
    COUNT(pi.id) AS total_count,
    MAX(pi.created_at) AS last_activity
FROM user_profiles up
LEFT JOIN pengumuman_internal pi ON pi.created_by = up.id
WHERE 'pengurus' = ANY(up.roles) OR up.role = 'pengurus'
GROUP BY up.user_id, up.nama
UNION ALL
SELECT 
    up.user_id AS pengurus_id,
    up.nama AS pengurus_nama,
    'buletin' AS activity_type,
    COUNT(bp.id) AS total_count,
    MAX(bp.created_at) AS last_activity
FROM user_profiles up
LEFT JOIN buletin_pondok bp ON bp.created_by = up.id
WHERE 'pengurus' = ANY(up.roles) OR up.role = 'pengurus'
GROUP BY up.user_id, up.nama;

-- View untuk trend pelanggaran (per bulan)
CREATE OR REPLACE VIEW v_trend_pelanggaran AS
SELECT 
    DATE_TRUNC('month', p.tanggal) AS bulan,
    p.tingkat,
    COUNT(*) AS jumlah
FROM pelanggaran p
GROUP BY DATE_TRUNC('month', p.tanggal), p.tingkat
ORDER BY bulan DESC;

-- =====================================================
-- 3. RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE audit_log_pengurus ENABLE ROW LEVEL SECURITY;

-- Admin bisa melihat semua audit log (READ-ONLY)
CREATE POLICY "Admin can view audit log pengurus"
ON audit_log_pengurus FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR 'admin' = ANY(roles))
    )
);

-- Pengurus bisa melihat log aktivitas sendiri
CREATE POLICY "Pengurus can view own audit log"
ON audit_log_pengurus FOR SELECT
USING (pengurus_id = auth.uid());

-- Hanya sistem yang bisa insert (via trigger/function)
CREATE POLICY "System can insert audit log"
ON audit_log_pengurus FOR INSERT
WITH CHECK (true);

-- TIDAK ADA UPDATE/DELETE - Append only
-- Ini memastikan log tidak bisa dihapus

-- =====================================================
-- 4. FUNCTION UNTUK LOGGING AKTIVITAS PENGURUS
-- =====================================================

CREATE OR REPLACE FUNCTION log_pengurus_activity(
    p_pengurus_id UUID,
    p_action TEXT,
    p_table_name TEXT,
    p_record_id UUID,
    p_old_data JSONB,
    p_new_data JSONB,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_pengurus_nama TEXT;
    v_log_id UUID;
BEGIN
    -- Get pengurus name
    SELECT nama INTO v_pengurus_nama
    FROM user_profiles
    WHERE user_id = p_pengurus_id;
    
    -- Insert log
    INSERT INTO audit_log_pengurus (
        pengurus_id,
        pengurus_nama,
        action,
        table_name,
        record_id,
        old_data,
        new_data,
        description
    ) VALUES (
        p_pengurus_id,
        v_pengurus_nama,
        p_action,
        p_table_name,
        p_record_id,
        p_old_data,
        p_new_data,
        p_description
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. TRIGGER UNTUK AUTO-LOG PELANGGARAN
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_log_pelanggaran()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Gunakan pelapor_id sebagai pengurus yang melakukan aksi
    IF TG_OP = 'INSERT' THEN
        -- Cari user_id dari pelapor_id (referensi ke user_profiles.id)
        SELECT user_id INTO v_user_id FROM user_profiles WHERE id = NEW.pelapor_id;
        
        PERFORM log_pengurus_activity(
            v_user_id,
            'CREATE',
            'pelanggaran',
            NEW.id,
            NULL,
            row_to_json(NEW)::JSONB,
            'Mencatat pelanggaran baru'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        SELECT user_id INTO v_user_id FROM user_profiles WHERE id = NEW.pelapor_id;
        
        PERFORM log_pengurus_activity(
            v_user_id,
            'UPDATE',
            'pelanggaran',
            NEW.id,
            row_to_json(OLD)::JSONB,
            row_to_json(NEW)::JSONB,
            'Mengupdate pelanggaran'
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        SELECT user_id INTO v_user_id FROM user_profiles WHERE id = OLD.pelapor_id;
        
        PERFORM log_pengurus_activity(
            v_user_id,
            'DELETE',
            'pelanggaran',
            OLD.id,
            row_to_json(OLD)::JSONB,
            NULL,
            'Menghapus pelanggaran'
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (only if pelanggaran table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pelanggaran') THEN
        DROP TRIGGER IF EXISTS trg_log_pelanggaran ON pelanggaran;
        CREATE TRIGGER trg_log_pelanggaran
        AFTER INSERT OR UPDATE OR DELETE ON pelanggaran
        FOR EACH ROW EXECUTE FUNCTION trigger_log_pelanggaran();
    END IF;
END $$;

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Admin Pengurus Monitoring berhasil dibuat!';
    RAISE NOTICE 'Tabel: audit_log_pengurus';
    RAISE NOTICE 'Views: v_statistik_pelanggaran_pengurus, v_aktivitas_pengurus, v_trend_pelanggaran';
    RAISE NOTICE 'Function: log_pengurus_activity()';
    RAISE NOTICE 'Trigger: trg_log_pelanggaran (pada tabel pelanggaran)';
END $$;
