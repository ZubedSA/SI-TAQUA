-- =============================================
-- SAFE UPDATE PHASE 1: AUDIT LOG & INDEXING
-- =============================================
-- Tujuan: Menambahkan tabel Audit Log dan Indexing untuk performa.
-- Sifat: NON-DESTRUCTIVE (Tidak menghapus data apapun)
-- =============================================

-- 1. AUDIT LOG TABLE
-- Cek jika tabel belum ada, baru buat.
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email VARCHAR(255),
    action VARCHAR(20) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, ERROR
    table_name VARCHAR(50) NOT NULL,
    record_id UUID,
    record_name VARCHAR(255),
    description TEXT,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Security
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Policies (Safe: Semua user authenticated bisa insert, hanya admin bisa baca semua)
-- Hapus policy lama jika ada untuk menghindari duplikat nama
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON audit_log;
DROP POLICY IF EXISTS "Enable select for admin only" ON audit_log;

CREATE POLICY "Enable insert for authenticated users" ON audit_log
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable select for admin only" ON audit_log
    FOR SELECT TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- 2. PERFORMANCE INDEXING
-- Indexing pada kolom yang sering dicari (Search, Filter, Sort)

-- Santri
CREATE INDEX IF NOT EXISTS idx_santri_nama ON santri(nama);
CREATE INDEX IF NOT EXISTS idx_santri_nis ON santri(nis);
CREATE INDEX IF NOT EXISTS idx_santri_kelas_id ON santri(kelas_id);
CREATE INDEX IF NOT EXISTS idx_santri_status ON santri(status);

-- Guru
CREATE INDEX IF NOT EXISTS idx_guru_nama ON guru(nama);
CREATE INDEX IF NOT EXISTS idx_guru_nip ON guru(nip);

-- Hafalan
CREATE INDEX IF NOT EXISTS idx_hafalan_santri_id ON hafalan(santri_id);
CREATE INDEX IF NOT EXISTS idx_hafalan_tanggal ON hafalan(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_hafalan_status ON hafalan(status);

-- Nilai
CREATE INDEX IF NOT EXISTS idx_nilai_santri_id ON nilai(santri_id);
CREATE INDEX IF NOT EXISTS idx_nilai_mapel_id ON nilai(mapel_id);
CREATE INDEX IF NOT EXISTS idx_nilai_semester_id ON nilai(semester_id);

-- Pembayaran & Tagihan
CREATE INDEX IF NOT EXISTS idx_tagihan_santri_id ON tagihan_santri(santri_id);
CREATE INDEX IF NOT EXISTS idx_tagihan_status ON tagihan_santri(status);
CREATE INDEX IF NOT EXISTS idx_pembayaran_santri_santri_id ON pembayaran_santri(santri_id);
CREATE INDEX IF NOT EXISTS idx_pembayaran_santri_tanggal ON pembayaran_santri(tanggal DESC);

-- Audit Log Sendiri
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_table_record ON audit_log(table_name, record_id);

-- =============================================
-- SELESAI
-- Silakan jalankan script ini di Supabase SQL Editor.
-- =============================================
