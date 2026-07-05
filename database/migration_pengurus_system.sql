-- =====================================================
-- MIGRATION: SISTEM PENGURUS (Dashboard Pembinaan)
-- Sistem Akademik PTQ Al-Usymuni Batuan
-- =====================================================
-- JALANKAN SQL INI DI SUPABASE SQL EDITOR
-- PASTIKAN BACKUP DATABASE TERLEBIH DAHULU!
-- =====================================================

-- =====================================================
-- 1. UPDATE ROLE CONSTRAINT (Backward-compatible)
-- =====================================================

-- Drop constraint lama jika ada
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Tambah constraint baru dengan role pengurus
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('admin', 'guru', 'wali', 'bendahara', 'pengasuh', 'pengurus'));

-- =====================================================
-- 2. TABEL PELANGGARAN
-- =====================================================

CREATE TABLE IF NOT EXISTS pelanggaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    tingkat INTEGER NOT NULL CHECK (tingkat BETWEEN 1 AND 4),
    -- Tingkat: 1=Ringan, 2=Sedang, 3=Berat, 4=Sangat Berat
    jenis VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    lokasi VARCHAR(255),
    saksi TEXT,
    pelapor_id UUID REFERENCES user_profiles(id),
    status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PROSES', 'SELESAI')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE pelanggaran IS 'Tabel untuk mencatat pelanggaran santri';
COMMENT ON COLUMN pelanggaran.tingkat IS '1=Ringan (teguran), 2=Sedang (peringatan), 3=Berat (panggil wali), 4=Sangat Berat (skorsing)';

-- =====================================================
-- 3. TABEL TINDAK LANJUT PELANGGARAN
-- =====================================================

CREATE TABLE IF NOT EXISTS tindak_lanjut_pelanggaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pelanggaran_id UUID NOT NULL REFERENCES pelanggaran(id) ON DELETE CASCADE,
    jenis_tindakan VARCHAR(100) NOT NULL,
    -- Contoh: 'Teguran Lisan', 'Peringatan Tertulis', 'Panggilan Wali', 'Skorsing', dll
    deskripsi TEXT,
    penanggung_jawab_id UUID REFERENCES user_profiles(id),
    tanggal_tindakan DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SELESAI')),
    catatan_private TEXT, -- Catatan internal pengurus, tidak ditampilkan ke wali
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tindak_lanjut_pelanggaran IS 'Tabel untuk mencatat tindak lanjut dari pelanggaran';

-- =====================================================
-- 4. TABEL PENGUMUMAN INTERNAL
-- =====================================================

CREATE TABLE IF NOT EXISTS pengumuman_internal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judul VARCHAR(255) NOT NULL,
    isi TEXT NOT NULL,
    kategori VARCHAR(50) DEFAULT 'UMUM' CHECK (kategori IN ('UMUM', 'PENTING', 'MENDESAK', 'INFO')),
    prioritas INTEGER DEFAULT 0, -- Makin tinggi makin atas
    mulai_tampil DATE DEFAULT CURRENT_DATE,
    selesai_tampil DATE,
    is_archived BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE pengumuman_internal IS 'Pengumuman internal untuk pengurus dan admin';

-- =====================================================
-- 5. TABEL INFORMASI PONDOK
-- =====================================================

CREATE TABLE IF NOT EXISTS informasi_pondok (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judul VARCHAR(255) NOT NULL,
    isi TEXT NOT NULL,
    kategori VARCHAR(50) DEFAULT 'INFO' CHECK (kategori IN ('INFO', 'PERATURAN', 'JADWAL', 'KONTAK', 'FASILITAS')),
    urutan INTEGER DEFAULT 0, -- Untuk sorting tampilan
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE informasi_pondok IS 'Informasi umum tentang pondok';

-- =====================================================
-- 6. TABEL BULETIN PONDOK
-- =====================================================

CREATE TABLE IF NOT EXISTS buletin_pondok (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judul VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    file_url TEXT, -- URL ke file di storage
    file_type VARCHAR(50), -- 'PDF', 'IMAGE', dll
    bulan INTEGER NOT NULL CHECK (bulan BETWEEN 1 AND 12),
    tahun INTEGER NOT NULL,
    is_archived BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE buletin_pondok IS 'Buletin bulanan pondok (PDF/gambar)';

-- =====================================================
-- 7. TABEL CATATAN PEMBINAAN SANTRI
-- =====================================================

CREATE TABLE IF NOT EXISTS catatan_pembinaan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
    pengurus_id UUID REFERENCES user_profiles(id),
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    jenis VARCHAR(50) DEFAULT 'UMUM' CHECK (jenis IN ('UMUM', 'KONSELING', 'PEMBINAAN', 'PUJIAN', 'CATATAN')),
    isi TEXT NOT NULL,
    is_private BOOLEAN DEFAULT TRUE, -- Private = hanya pengurus yang bisa lihat
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE catatan_pembinaan IS 'Catatan pembinaan per santri oleh pengurus';

-- =====================================================
-- 8. VIEW SANTRI BERMASALAH (Auto-calculated)
-- =====================================================

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
    MAX(p.tanggal) as pelanggaran_terakhir,
    ARRAY_AGG(DISTINCT p.tingkat ORDER BY p.tingkat DESC) as tingkat_pelanggaran
FROM santri s
LEFT JOIN kelas k ON k.id = s.kelas_id
LEFT JOIN halaqoh h ON h.id = s.halaqoh_id
JOIN pelanggaran p ON p.santri_id = s.id
WHERE p.tanggal >= CURRENT_DATE - INTERVAL '6 months'
  AND s.status = 'Aktif'
GROUP BY s.id, s.nis, s.nama, s.kelas_id, k.nama, h.nama
HAVING COUNT(p.id) >= 3 OR SUM(CASE WHEN p.tingkat >= 3 THEN 1 ELSE 0 END) >= 1;

COMMENT ON VIEW santri_bermasalah IS 'Santri dengan 3+ pelanggaran atau 1+ pelanggaran berat dalam 6 bulan terakhir';

-- =====================================================
-- 9. INDEXES UNTUK PERFORMA
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_pelanggaran_santri ON pelanggaran(santri_id);
CREATE INDEX IF NOT EXISTS idx_pelanggaran_tanggal ON pelanggaran(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_pelanggaran_status ON pelanggaran(status);
CREATE INDEX IF NOT EXISTS idx_pelanggaran_tingkat ON pelanggaran(tingkat);
CREATE INDEX IF NOT EXISTS idx_tindak_lanjut_pelanggaran ON tindak_lanjut_pelanggaran(pelanggaran_id);
CREATE INDEX IF NOT EXISTS idx_pengumuman_aktif ON pengumuman_internal(is_archived, mulai_tampil);
CREATE INDEX IF NOT EXISTS idx_buletin_periode ON buletin_pondok(tahun DESC, bulan DESC);
CREATE INDEX IF NOT EXISTS idx_catatan_santri ON catatan_pembinaan(santri_id);

-- =====================================================
-- 10. TRIGGERS UNTUK UPDATED_AT
-- =====================================================

-- Pastikan function update_updated_at_column sudah ada
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_pelanggaran_updated_at ON pelanggaran;
CREATE TRIGGER update_pelanggaran_updated_at 
    BEFORE UPDATE ON pelanggaran
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tindak_lanjut_updated_at ON tindak_lanjut_pelanggaran;
CREATE TRIGGER update_tindak_lanjut_updated_at 
    BEFORE UPDATE ON tindak_lanjut_pelanggaran
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pengumuman_updated_at ON pengumuman_internal;
CREATE TRIGGER update_pengumuman_updated_at 
    BEFORE UPDATE ON pengumuman_internal
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_informasi_updated_at ON informasi_pondok;
CREATE TRIGGER update_informasi_updated_at 
    BEFORE UPDATE ON informasi_pondok
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_buletin_updated_at ON buletin_pondok;
CREATE TRIGGER update_buletin_updated_at 
    BEFORE UPDATE ON buletin_pondok
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_catatan_updated_at ON catatan_pembinaan;
CREATE TRIGGER update_catatan_updated_at 
    BEFORE UPDATE ON catatan_pembinaan
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 11. AUTO-UPDATE STATUS PELANGGARAN
-- =====================================================

-- Trigger untuk auto-update status pelanggaran ke PROSES saat ada tindak lanjut
CREATE OR REPLACE FUNCTION update_pelanggaran_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Jika ada tindak lanjut baru, update status pelanggaran ke PROSES
    IF TG_OP = 'INSERT' THEN
        UPDATE pelanggaran 
        SET status = 'PROSES', updated_at = NOW()
        WHERE id = NEW.pelanggaran_id AND status = 'OPEN';
    END IF;
    
    -- Jika tindak lanjut selesai, cek apakah semua tindak lanjut selesai
    IF TG_OP = 'UPDATE' AND NEW.status = 'SELESAI' THEN
        -- Cek apakah masih ada tindak lanjut yang pending
        IF NOT EXISTS (
            SELECT 1 FROM tindak_lanjut_pelanggaran 
            WHERE pelanggaran_id = NEW.pelanggaran_id 
            AND status = 'PENDING' 
            AND id != NEW.id
        ) THEN
            UPDATE pelanggaran 
            SET status = 'SELESAI', updated_at = NOW()
            WHERE id = NEW.pelanggaran_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pelanggaran_status ON tindak_lanjut_pelanggaran;
CREATE TRIGGER trigger_update_pelanggaran_status
    AFTER INSERT OR UPDATE ON tindak_lanjut_pelanggaran
    FOR EACH ROW EXECUTE FUNCTION update_pelanggaran_status();

-- =====================================================
-- 12. VERIFICATION QUERIES
-- =====================================================

-- Cek tabel berhasil dibuat
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('pelanggaran', 'tindak_lanjut_pelanggaran', 
                   'pengumuman_internal', 'informasi_pondok', 
                   'buletin_pondok', 'catatan_pembinaan');

-- Cek constraint role
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'user_profiles_role_check';

-- =====================================================
-- MIGRATION SELESAI
-- =====================================================
