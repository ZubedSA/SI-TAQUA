-- =====================================================
-- MIGRATION: PORTAL WALI SANTRI
-- Sistem Akademik PTQ Al-Usymuni Batuan
-- =====================================================
-- JALANKAN SQL INI DI SUPABASE SQL EDITOR
-- =====================================================

-- =====================================================
-- 1. TABEL PENGUMUMAN PONDOK
-- =====================================================
CREATE TABLE IF NOT EXISTS pengumuman (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    judul VARCHAR(255) NOT NULL,
    isi TEXT NOT NULL,
    kategori VARCHAR(50) DEFAULT 'Umum' CHECK (kategori IN ('Umum', 'Akademik', 'Keuangan', 'Kegiatan', 'Libur', 'Ujian')),
    tanggal_publish DATE DEFAULT CURRENT_DATE,
    tanggal_expired DATE,
    prioritas INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_pengumuman_active ON pengumuman(is_active, tanggal_publish DESC);
CREATE INDEX IF NOT EXISTS idx_pengumuman_kategori ON pengumuman(kategori);

-- =====================================================
-- 2. TABEL PESAN WALI KE PONDOK
-- =====================================================
CREATE TABLE IF NOT EXISTS pesan_wali (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wali_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    santri_id UUID REFERENCES santri(id) ON DELETE SET NULL,
    judul VARCHAR(255) NOT NULL,
    isi TEXT NOT NULL,
    kategori VARCHAR(50) DEFAULT 'Umum' CHECK (kategori IN ('Umum', 'Akademik', 'Keuangan', 'Izin', 'Keluhan', 'Lainnya')),
    status VARCHAR(20) DEFAULT 'Terkirim' CHECK (status IN ('Terkirim', 'Dibaca', 'Diproses', 'Dibalas', 'Selesai')),
    balasan TEXT,
    dibalas_oleh UUID REFERENCES auth.users(id),
    dibalas_pada TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_pesan_wali_id ON pesan_wali(wali_id);
CREATE INDEX IF NOT EXISTS idx_pesan_status ON pesan_wali(status);
CREATE INDEX IF NOT EXISTS idx_pesan_created ON pesan_wali(created_at DESC);

-- =====================================================
-- 3. TABEL BUKTI TRANSFER (OPSIONAL)
-- =====================================================
CREATE TABLE IF NOT EXISTS bukti_transfer (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tagihan_id UUID REFERENCES tagihan_santri(id) ON DELETE CASCADE,
    santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
    wali_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    jumlah DECIMAL(15,2) NOT NULL,
    tanggal_transfer DATE NOT NULL DEFAULT CURRENT_DATE,
    bukti_url TEXT NOT NULL,
    catatan TEXT,
    status VARCHAR(20) DEFAULT 'Menunggu' CHECK (status IN ('Menunggu', 'Diverifikasi', 'Ditolak')),
    diverifikasi_oleh UUID REFERENCES auth.users(id),
    diverifikasi_pada TIMESTAMPTZ,
    catatan_verifikasi TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_bukti_santri ON bukti_transfer(santri_id);
CREATE INDEX IF NOT EXISTS idx_bukti_wali ON bukti_transfer(wali_id);
CREATE INDEX IF NOT EXISTS idx_bukti_status ON bukti_transfer(status);

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE pengumuman ENABLE ROW LEVEL SECURITY;
ALTER TABLE pesan_wali ENABLE ROW LEVEL SECURITY;
ALTER TABLE bukti_transfer ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. RLS POLICIES - PENGUMUMAN
-- =====================================================
-- Semua user authenticated bisa baca pengumuman aktif
CREATE POLICY "pengumuman_select_all" ON pengumuman
FOR SELECT TO authenticated
USING (is_active = true);

-- Admin bisa CRUD pengumuman
CREATE POLICY "pengumuman_admin_all" ON pengumuman
FOR ALL TO authenticated
USING (get_user_role() = 'admin')
WITH CHECK (get_user_role() = 'admin');

-- =====================================================
-- 6. RLS POLICIES - PESAN WALI
-- =====================================================
-- Wali hanya bisa lihat pesan miliknya
CREATE POLICY "pesan_wali_select" ON pesan_wali
FOR SELECT TO authenticated
USING (
    CASE get_user_role()
        WHEN 'admin' THEN true
        WHEN 'wali' THEN wali_id = auth.uid()
        ELSE false
    END
);

-- Wali hanya bisa insert pesan miliknya
CREATE POLICY "pesan_wali_insert" ON pesan_wali
FOR INSERT TO authenticated
WITH CHECK (
    get_user_role() = 'wali' AND wali_id = auth.uid()
);

-- Admin bisa update pesan (untuk membalas)
CREATE POLICY "pesan_wali_admin_update" ON pesan_wali
FOR UPDATE TO authenticated
USING (get_user_role() = 'admin')
WITH CHECK (get_user_role() = 'admin');

-- =====================================================
-- 7. RLS POLICIES - BUKTI TRANSFER
-- =====================================================
-- Wali hanya bisa lihat bukti miliknya
CREATE POLICY "bukti_transfer_select" ON bukti_transfer
FOR SELECT TO authenticated
USING (
    CASE get_user_role()
        WHEN 'admin' THEN true
        WHEN 'bendahara' THEN true
        WHEN 'wali' THEN wali_id = auth.uid()
        ELSE false
    END
);

-- Wali hanya bisa insert bukti untuk santri miliknya
CREATE POLICY "bukti_transfer_insert" ON bukti_transfer
FOR INSERT TO authenticated
WITH CHECK (
    get_user_role() = 'wali' AND 
    wali_id = auth.uid() AND
    santri_id IN (SELECT id FROM santri WHERE wali_id = auth.uid())
);

-- Admin/Bendahara bisa update bukti (untuk verifikasi)
CREATE POLICY "bukti_transfer_admin_update" ON bukti_transfer
FOR UPDATE TO authenticated
USING (get_user_role() IN ('admin', 'bendahara'))
WITH CHECK (get_user_role() IN ('admin', 'bendahara'));

-- =====================================================
-- 8. RLS POLICIES - TAGIHAN SANTRI (UPDATE)
-- =====================================================
-- Tambah policy untuk wali bisa melihat tagihan santri miliknya
DROP POLICY IF EXISTS "wali_tagihan_select" ON tagihan_santri;

CREATE POLICY "wali_tagihan_select" ON tagihan_santri
FOR SELECT TO authenticated
USING (
    CASE get_user_role()
        WHEN 'admin' THEN true
        WHEN 'bendahara' THEN true
        WHEN 'pengasuh' THEN true
        WHEN 'wali' THEN santri_id IN (SELECT id FROM santri WHERE wali_id = auth.uid())
        ELSE false
    END
);

-- =====================================================
-- 9. RLS POLICIES - PEMBAYARAN SANTRI (UPDATE)
-- =====================================================
-- Tambah policy untuk wali bisa melihat pembayaran santri miliknya
DROP POLICY IF EXISTS "wali_pembayaran_select" ON pembayaran_santri;

CREATE POLICY "wali_pembayaran_select" ON pembayaran_santri
FOR SELECT TO authenticated
USING (
    CASE get_user_role()
        WHEN 'admin' THEN true
        WHEN 'bendahara' THEN true
        WHEN 'pengasuh' THEN true
        WHEN 'wali' THEN santri_id IN (SELECT id FROM santri WHERE wali_id = auth.uid())
        ELSE false
    END
);

-- =====================================================
-- 10. TRIGGER untuk updated_at
-- =====================================================
CREATE TRIGGER update_pengumuman_updated_at 
    BEFORE UPDATE ON pengumuman 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pesan_wali_updated_at 
    BEFORE UPDATE ON pesan_wali 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 11. SAMPLE DATA - PENGUMUMAN
-- =====================================================
INSERT INTO pengumuman (judul, isi, kategori, prioritas) VALUES
('Selamat Datang di Portal Wali Santri', 'Assalamu''alaikum Wr. Wb.\n\nKepada Yth. Bapak/Ibu Wali Santri,\n\nSelamat datang di Portal Wali Santri PTQ Al-Usymuni Batuan. Melalui portal ini, Bapak/Ibu dapat memantau perkembangan putra/putri tercinta.', 'Umum', 10),
('Jadwal Libur Akhir Tahun 2024', 'Diberitahukan kepada seluruh wali santri bahwa libur akhir tahun dimulai tanggal 20 Desember 2024 hingga 5 Januari 2025.', 'Libur', 5),
('Pembayaran SPP Januari 2025', 'Pembayaran SPP bulan Januari 2025 sudah dapat dilakukan. Mohon segera melunasi sebelum tanggal 10 Januari 2025.', 'Keuangan', 8)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 12. VERIFICATION QUERIES
-- =====================================================
-- Cek tabel sudah dibuat
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('pengumuman', 'pesan_wali', 'bukti_transfer');

-- Cek policies
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('pengumuman', 'pesan_wali', 'bukti_transfer', 'tagihan_santri', 'pembayaran_santri');

-- =====================================================
-- DONE! Jalankan SQL ini di Supabase SQL Editor
-- =====================================================
