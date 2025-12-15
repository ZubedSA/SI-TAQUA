-- =====================================================
-- Sistem Akademik PTQ Al-Usymuni Batuan
-- Database Schema untuk Supabase (PostgreSQL)
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABEL GURU
-- =====================================================
CREATE TABLE IF NOT EXISTS guru (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nip VARCHAR(50) UNIQUE NOT NULL,
    nama VARCHAR(255) NOT NULL,
    jenis_kelamin VARCHAR(20) NOT NULL CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
    tempat_lahir VARCHAR(100),
    tanggal_lahir DATE,
    alamat TEXT,
    no_telp VARCHAR(20),
    email VARCHAR(255),
    jabatan VARCHAR(100) DEFAULT 'Pengajar',
    pendidikan_terakhir VARCHAR(50),
    status VARCHAR(20) DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Tidak Aktif', 'Cuti')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABEL KELAS
-- =====================================================
CREATE TABLE IF NOT EXISTS kelas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(50) NOT NULL,
    tingkat INTEGER NOT NULL CHECK (tingkat BETWEEN 1 AND 12),
    wali_kelas_id UUID REFERENCES guru(id) ON DELETE SET NULL,
    tahun_ajaran VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABEL HALAQOH
-- =====================================================
CREATE TABLE IF NOT EXISTS halaqoh (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(100) NOT NULL,
    musyrif_id UUID REFERENCES guru(id) ON DELETE SET NULL,
    waktu VARCHAR(100),
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABEL SANTRI
-- =====================================================
CREATE TABLE IF NOT EXISTS santri (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nis VARCHAR(50) UNIQUE NOT NULL,
    nama VARCHAR(255) NOT NULL,
    jenis_kelamin VARCHAR(20) NOT NULL CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
    tempat_lahir VARCHAR(100),
    tanggal_lahir DATE,
    alamat TEXT,
    no_telp VARCHAR(20),
    nama_wali VARCHAR(255),
    no_telp_wali VARCHAR(20),
    kelas_id UUID REFERENCES kelas(id) ON DELETE SET NULL,
    halaqoh_id UUID REFERENCES halaqoh(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Tidak Aktif', 'Lulus', 'Pindah')),
    foto_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABEL MATA PELAJARAN
-- =====================================================
CREATE TABLE IF NOT EXISTS mapel (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode VARCHAR(20) UNIQUE NOT NULL,
    nama VARCHAR(100) NOT NULL,
    deskripsi TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABEL HAFALAN
-- =====================================================
CREATE TABLE IF NOT EXISTS hafalan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
    juz INTEGER NOT NULL CHECK (juz BETWEEN 1 AND 30),
    surah VARCHAR(100) NOT NULL,
    ayat_mulai INTEGER,
    ayat_selesai INTEGER,
    status VARCHAR(20) DEFAULT 'Proses' CHECK (status IN ('Belum', 'Proses', 'Mutqin')),
    tanggal DATE NOT NULL,
    catatan TEXT,
    penguji_id UUID REFERENCES guru(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABEL PRESENSI
-- =====================================================
CREATE TABLE IF NOT EXISTS presensi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('hadir', 'izin', 'sakit', 'alpha')),
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(santri_id, tanggal)
);

-- =====================================================
-- TABEL NILAI
-- =====================================================
CREATE TABLE IF NOT EXISTS nilai (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
    mapel_id UUID NOT NULL REFERENCES mapel(id) ON DELETE CASCADE,
    nilai_tugas DECIMAL(5,2),
    nilai_uts DECIMAL(5,2),
    nilai_uas DECIMAL(5,2),
    nilai_akhir DECIMAL(5,2),
    semester VARCHAR(10) NOT NULL CHECK (semester IN ('Ganjil', 'Genap')),
    tahun_ajaran VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(santri_id, mapel_id, semester, tahun_ajaran)
);

-- =====================================================
-- TABEL SEMESTER
-- =====================================================
CREATE TABLE IF NOT EXISTS semester (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(50) NOT NULL,
    tahun_ajaran VARCHAR(20) NOT NULL,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABEL AUDIT LOG
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_santri_kelas ON santri(kelas_id);
CREATE INDEX IF NOT EXISTS idx_santri_halaqoh ON santri(halaqoh_id);
CREATE INDEX IF NOT EXISTS idx_hafalan_santri ON hafalan(santri_id);
CREATE INDEX IF NOT EXISTS idx_hafalan_tanggal ON hafalan(tanggal);
CREATE INDEX IF NOT EXISTS idx_presensi_santri ON presensi(santri_id);
CREATE INDEX IF NOT EXISTS idx_presensi_tanggal ON presensi(tanggal);
CREATE INDEX IF NOT EXISTS idx_nilai_santri ON nilai(santri_id);

-- =====================================================
-- TRIGGERS untuk updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_guru_updated_at BEFORE UPDATE ON guru
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kelas_updated_at BEFORE UPDATE ON kelas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_halaqoh_updated_at BEFORE UPDATE ON halaqoh
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_santri_updated_at BEFORE UPDATE ON santri
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hafalan_updated_at BEFORE UPDATE ON hafalan
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nilai_updated_at BEFORE UPDATE ON nilai
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Insert sample guru
INSERT INTO guru (nip, nama, jenis_kelamin, jabatan, status) VALUES
('G001', 'Ustadz Ahmad Hidayat', 'Laki-laki', 'Pengajar', 'Aktif'),
('G002', 'Ustadz Muhammad Faisal', 'Laki-laki', 'Wali Kelas', 'Aktif')
ON CONFLICT (nip) DO NOTHING;

-- Insert sample kelas
INSERT INTO kelas (nama, tingkat, tahun_ajaran) VALUES
('VII A', 7, '2024/2025'),
('VII B', 7, '2024/2025'),
('VIII A', 8, '2024/2025'),
('VIII B', 8, '2024/2025')
ON CONFLICT DO NOTHING;

-- Insert sample halaqoh
INSERT INTO halaqoh (nama, waktu) VALUES
('Halaqoh 1', 'Ba''da Subuh'),
('Halaqoh 2', 'Ba''da Ashar')
ON CONFLICT DO NOTHING;

-- Insert sample santri
INSERT INTO santri (nis, nama, jenis_kelamin, status) VALUES
('S001', 'Ahmad Fauzi', 'Laki-laki', 'Aktif'),
('S002', 'Muhammad Rizki', 'Laki-laki', 'Aktif')
ON CONFLICT (nis) DO NOTHING;

-- Insert sample mapel
INSERT INTO mapel (kode, nama) VALUES
('TJW', 'Tajwid'),
('THF', 'Tahfizh'),
('FQH', 'Fiqih'),
('AQD', 'Aqidah'),
('AKH', 'Akhlaq'),
('BIN', 'Bahasa Indonesia'),
('MTK', 'Matematika'),
('IPA', 'Ilmu Pengetahuan Alam'),
('IPS', 'Ilmu Pengetahuan Sosial'),
('BAR', 'Bahasa Arab'),
('BIG', 'Bahasa Inggris')
ON CONFLICT (kode) DO NOTHING;

-- =====================================================
-- ROW LEVEL SECURITY (Opsional untuk production)
-- =====================================================
-- ALTER TABLE santri ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE guru ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE hafalan ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE presensi ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE nilai ENABLE ROW LEVEL SECURITY;
