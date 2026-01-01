-- =============================================
-- SAFE UPDATE PHASE 2: SOFT DELETE (TRASH BIN)
-- =============================================
-- Tujuan: Agar data yang dihapus TIDAK HILANG PERMANEN, tapi masuk ke tabel 'trash'.
-- Sifat: NON-DESTRUCTIVE & SAFE FOR RESTORE
-- =============================================

-- 1. Buat Tabel Trash (Tempat Sampah)
CREATE TABLE IF NOT EXISTS trash (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    original_id UUID NOT NULL,
    data JSONB NOT NULL,
    deleted_by UUID, -- Referencing auth.users
    deleted_at TIMESTAMPTZ DEFAULT NOW(),
    auto_delete_at TIMESTAMPTZ, -- Kapan akan dihapus permanen (misal 30 hari)
    reason TEXT
);

-- Enable Security pada Trash
ALTER TABLE trash ENABLE ROW LEVEL SECURITY;

-- Policy: Admin boleh lihat semua, User biasa tidak boleh lihat (hidden)
DROP POLICY IF EXISTS "Admin view trash" ON trash;
CREATE POLICY "Admin view trash" ON trash
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- 2. Buat Function Trigger
CREATE OR REPLACE FUNCTION move_to_trash()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO trash (table_name, original_id, data, deleted_by, deleted_at, auto_delete_at, reason)
    VALUES (
        TG_TABLE_NAME,
        OLD.id,
        to_jsonb(OLD),
        auth.uid(),
        NOW(),
        NOW() + INTERVAL '30 days',
        'Soft Delete via App'
    );
    RETURN OLD; -- Lanjutkan proses delete di tabel asli (datanya hilang dari tabel asli, tapi aman di trash)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Pasang Trigger ke Tabel-Tabel Penting
-- (DROP dulu biar aman kalau dijalankan ulang)

-- Santri
DROP TRIGGER IF EXISTS soft_delete_santri ON santri;
CREATE TRIGGER soft_delete_santri
    BEFORE DELETE ON santri
    FOR EACH ROW EXECUTE FUNCTION move_to_trash();

-- Guru
DROP TRIGGER IF EXISTS soft_delete_guru ON guru;
CREATE TRIGGER soft_delete_guru
    BEFORE DELETE ON guru
    FOR EACH ROW EXECUTE FUNCTION move_to_trash();

-- Hafalan
DROP TRIGGER IF EXISTS soft_delete_hafalan ON hafalan;
CREATE TRIGGER soft_delete_hafalan
    BEFORE DELETE ON hafalan
    FOR EACH ROW EXECUTE FUNCTION move_to_trash();

-- Nilai
DROP TRIGGER IF EXISTS soft_delete_nilai ON nilai;
CREATE TRIGGER soft_delete_nilai
    BEFORE DELETE ON nilai
    FOR EACH ROW EXECUTE FUNCTION move_to_trash();

-- Keuangan (Tagihan & Pembayaran)
DROP TRIGGER IF EXISTS soft_delete_tagihan ON tagihan_santri;
CREATE TRIGGER soft_delete_tagihan
    BEFORE DELETE ON tagihan_santri
    FOR EACH ROW EXECUTE FUNCTION move_to_trash();

DROP TRIGGER IF EXISTS soft_delete_pembayaran ON pembayaran_santri;
CREATE TRIGGER soft_delete_pembayaran
    BEFORE DELETE ON pembayaran_santri
    FOR EACH ROW EXECUTE FUNCTION move_to_trash();

-- Kelas & Mapel (Master Data)
DROP TRIGGER IF EXISTS soft_delete_kelas ON kelas;
CREATE TRIGGER soft_delete_kelas
    BEFORE DELETE ON kelas
    FOR EACH ROW EXECUTE FUNCTION move_to_trash();

DROP TRIGGER IF EXISTS soft_delete_mapel ON mapel;
CREATE TRIGGER soft_delete_mapel
    BEFORE DELETE ON mapel
    FOR EACH ROW EXECUTE FUNCTION move_to_trash();

-- =============================================
-- SELESAI
-- Jalankan di Supabase SQL Editor.
-- Sekarang setiap kali tombol "Hapus" ditekan di aplikasi, data akan tercopy ke 'trash' sebelum hilang.
-- =============================================
