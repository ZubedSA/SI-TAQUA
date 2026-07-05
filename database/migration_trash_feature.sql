-- =====================================================
-- Migration: Trash/Sampah Feature (Soft Delete)
-- 
-- Fitur:
-- 1. Data yang dihapus disimpan di tabel 'trash' selama 30 hari
-- 2. Data dapat dipulihkan kembali ke tabel asli
-- 3. Data otomatis terhapus permanen setelah 30 hari
-- =====================================================

-- Buat tabel trash untuk menyimpan data yang dihapus
CREATE TABLE IF NOT EXISTS trash (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    original_id UUID NOT NULL,
    data JSONB NOT NULL,
    deleted_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    auto_delete_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_trash_table_name ON trash(table_name);
CREATE INDEX IF NOT EXISTS idx_trash_deleted_at ON trash(deleted_at);
CREATE INDEX IF NOT EXISTS idx_trash_auto_delete_at ON trash(auto_delete_at);

-- Function untuk memindahkan data ke trash sebelum delete
CREATE OR REPLACE FUNCTION move_to_trash()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO trash (table_name, original_id, data, deleted_by, deleted_at, auto_delete_at)
    VALUES (
        TG_TABLE_NAME,
        OLD.id,
        to_jsonb(OLD),
        auth.uid(),
        NOW(),
        NOW() + INTERVAL '30 days'
    );
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger untuk tabel santri
DROP TRIGGER IF EXISTS santri_to_trash ON santri;
CREATE TRIGGER santri_to_trash
    BEFORE DELETE ON santri
    FOR EACH ROW
    EXECUTE FUNCTION move_to_trash();

-- Trigger untuk tabel guru
DROP TRIGGER IF EXISTS guru_to_trash ON guru;
CREATE TRIGGER guru_to_trash
    BEFORE DELETE ON guru
    FOR EACH ROW
    EXECUTE FUNCTION move_to_trash();

-- Trigger untuk tabel hafalan
DROP TRIGGER IF EXISTS hafalan_to_trash ON hafalan;
CREATE TRIGGER hafalan_to_trash
    BEFORE DELETE ON hafalan
    FOR EACH ROW
    EXECUTE FUNCTION move_to_trash();

-- Trigger untuk tabel nilai
DROP TRIGGER IF EXISTS nilai_to_trash ON nilai;
CREATE TRIGGER nilai_to_trash
    BEFORE DELETE ON nilai
    FOR EACH ROW
    EXECUTE FUNCTION move_to_trash();

-- Trigger untuk tabel presensi
DROP TRIGGER IF EXISTS presensi_to_trash ON presensi;
CREATE TRIGGER presensi_to_trash
    BEFORE DELETE ON presensi
    FOR EACH ROW
    EXECUTE FUNCTION move_to_trash();

-- Trigger untuk tabel kelas
DROP TRIGGER IF EXISTS kelas_to_trash ON kelas;
CREATE TRIGGER kelas_to_trash
    BEFORE DELETE ON kelas
    FOR EACH ROW
    EXECUTE FUNCTION move_to_trash();

-- Trigger untuk tabel mapel
DROP TRIGGER IF EXISTS mapel_to_trash ON mapel;
CREATE TRIGGER mapel_to_trash
    BEFORE DELETE ON mapel
    FOR EACH ROW
    EXECUTE FUNCTION move_to_trash();

-- Trigger untuk tabel halaqoh
DROP TRIGGER IF EXISTS halaqoh_to_trash ON halaqoh;
CREATE TRIGGER halaqoh_to_trash
    BEFORE DELETE ON halaqoh
    FOR EACH ROW
    EXECUTE FUNCTION move_to_trash();

-- RLS untuk tabel trash (hanya admin yang bisa akses)
ALTER TABLE trash ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admin can view trash" ON trash;
DROP POLICY IF EXISTS "Admin can delete from trash" ON trash;
DROP POLICY IF EXISTS "Admin can insert to trash" ON trash;

-- Admin dapat melihat semua data di trash
CREATE POLICY "Admin can view trash"
ON trash FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Admin dapat menghapus data dari trash (hapus permanen)
CREATE POLICY "Admin can delete from trash"
ON trash FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- System dapat insert ke trash (dari trigger)
CREATE POLICY "System can insert to trash"
ON trash FOR INSERT
TO authenticated
WITH CHECK (true);

-- Function untuk auto-cleanup data lama (>30 hari)
-- Jalankan ini secara periodik via cron/scheduled job
CREATE OR REPLACE FUNCTION cleanup_old_trash()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM trash WHERE auto_delete_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_old_trash() TO authenticated;

-- =====================================================
-- CATATAN PENGGUNAAN:
-- 
-- 1. Jalankan migration ini di Supabase SQL Editor
-- 2. Untuk auto-cleanup, setup Edge Function atau 
--    Supabase scheduled job untuk memanggil cleanup_old_trash()
-- 3. Data yang dihapus dari tabel santri, guru, hafalan, 
--    nilai, presensi, kelas, mapel, halaqoh akan otomatis 
--    masuk ke tabel trash
-- =====================================================
