-- ================================================
-- TAMBAHAN TABEL DAN SAMPLE DATA
-- Jalankan di Supabase SQL Editor
-- ================================================

-- TABEL SEMESTER
CREATE TABLE IF NOT EXISTS semester (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama VARCHAR(50) NOT NULL,
    tahun_ajaran VARCHAR(20) NOT NULL,
    tanggal_mulai DATE,
    tanggal_selesai DATE,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL NILAI
CREATE TABLE IF NOT EXISTS nilai (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
    mapel_id UUID NOT NULL REFERENCES mapel(id) ON DELETE CASCADE,
    semester_id UUID REFERENCES semester(id) ON DELETE SET NULL,
    nilai_tugas DECIMAL(5,2),
    nilai_uts DECIMAL(5,2),
    nilai_uas DECIMAL(5,2),
    nilai_akhir DECIMAL(5,2),
    tahun_ajaran VARCHAR(20) DEFAULT '2024/2025',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(santri_id, mapel_id, semester_id)
);

-- TABEL AUDIT LOG
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    record_name VARCHAR(255),
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE semester ENABLE ROW LEVEL SECURITY;
ALTER TABLE nilai ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow all" ON semester FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON nilai FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON audit_log FOR ALL USING (true) WITH CHECK (true);

-- ================================================
-- SAMPLE DATA
-- ================================================

-- Sample Guru
INSERT INTO guru (nip, nama, jenis_kelamin, jabatan, no_telp, status) VALUES
('G001', 'Ustadz Ahmad Fauzi, S.Pd.I', 'Laki-laki', 'Wali Kelas', '081234567890', 'Aktif'),
('G002', 'Ustadz Muhammad Hidayat, Lc', 'Laki-laki', 'Musyrif', '081234567891', 'Aktif'),
('G003', 'Ustadz Abdurrahman, S.Ag', 'Laki-laki', 'Pengajar', '081234567892', 'Aktif'),
('G004', 'Ustadz Faisal Rahman, M.A', 'Laki-laki', 'Pengajar', '081234567893', 'Aktif'),
('G005', 'Ustadzah Fatimah Az-Zahra, S.Pd', 'Perempuan', 'Pengajar', '081234567894', 'Aktif')
ON CONFLICT (nip) DO NOTHING;

-- Sample Kelas (get wali_kelas_id from guru)
INSERT INTO kelas (nama, tingkat, tahun_ajaran) VALUES
('VII A', 7, '2024/2025'),
('VII B', 7, '2024/2025'),
('VIII A', 8, '2024/2025'),
('VIII B', 8, '2024/2025'),
('IX A', 9, '2024/2025')
ON CONFLICT DO NOTHING;

-- Sample Halaqoh
INSERT INTO halaqoh (nama, waktu, keterangan) VALUES
('Halaqoh 1', 'Ba''da Subuh', 'Halaqoh tahfizh pagi'),
('Halaqoh 2', 'Ba''da Ashar', 'Halaqoh tahfizh sore'),
('Halaqoh 3', 'Ba''da Maghrib', 'Halaqoh tahfizh malam'),
('Halaqoh 4', 'Ba''da Isya', 'Halaqoh murajaah')
ON CONFLICT DO NOTHING;

-- Sample Mapel
INSERT INTO mapel (kode, nama, deskripsi) VALUES
('TJW', 'Tajwid', 'Ilmu membaca Al-Quran dengan baik dan benar'),
('THF', 'Tahfizh', 'Hafalan Al-Quran'),
('FQH', 'Fiqih', 'Hukum Islam'),
('AQD', 'Aqidah', 'Dasar-dasar keimanan'),
('AKH', 'Akhlaq', 'Budi pekerti dan adab'),
('BAR', 'Bahasa Arab', 'Pembelajaran bahasa Arab'),
('MTK', 'Matematika', 'Ilmu hitung dan logika'),
('IPA', 'IPA', 'Ilmu Pengetahuan Alam'),
('IPS', 'IPS', 'Ilmu Pengetahuan Sosial'),
('BIN', 'Bahasa Indonesia', 'Bahasa Indonesia')
ON CONFLICT (kode) DO NOTHING;

-- Sample Semester
INSERT INTO semester (nama, tahun_ajaran, tanggal_mulai, tanggal_selesai, is_active) VALUES
('Ganjil', '2024/2025', '2024-07-15', '2024-12-20', true),
('Genap', '2023/2024', '2024-01-08', '2024-06-15', false),
('Ganjil', '2023/2024', '2023-07-17', '2023-12-22', false)
ON CONFLICT DO NOTHING;

-- Sample Santri (setelah kelas dan halaqoh ada)
DO $$
DECLARE
    kelas_7a UUID;
    kelas_7b UUID;
    kelas_8a UUID;
    halaqoh_1 UUID;
    halaqoh_2 UUID;
BEGIN
    SELECT id INTO kelas_7a FROM kelas WHERE nama = 'VII A' LIMIT 1;
    SELECT id INTO kelas_7b FROM kelas WHERE nama = 'VII B' LIMIT 1;
    SELECT id INTO kelas_8a FROM kelas WHERE nama = 'VIII A' LIMIT 1;
    SELECT id INTO halaqoh_1 FROM halaqoh WHERE nama = 'Halaqoh 1' LIMIT 1;
    SELECT id INTO halaqoh_2 FROM halaqoh WHERE nama = 'Halaqoh 2' LIMIT 1;
    
    INSERT INTO santri (nis, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, nama_wali, kelas_id, halaqoh_id, status) VALUES
    ('S2024001', 'Ahmad Fauzi', 'Laki-laki', 'Pamekasan', '2010-05-15', 'H. Muhammad', kelas_7a, halaqoh_1, 'Aktif'),
    ('S2024002', 'Muhammad Rizki Pratama', 'Laki-laki', 'Sumenep', '2010-08-22', 'Abdul Rahman', kelas_7a, halaqoh_1, 'Aktif'),
    ('S2024003', 'Abdullah Rahman', 'Laki-laki', 'Sampang', '2010-03-10', 'H. Usman', kelas_7a, halaqoh_2, 'Aktif'),
    ('S2024004', 'Umar Faruq Al-Farisi', 'Laki-laki', 'Bangkalan', '2010-11-28', 'Salim', kelas_7b, halaqoh_1, 'Aktif'),
    ('S2024005', 'Zaid bin Harits', 'Laki-laki', 'Pamekasan', '2009-07-17', 'H. Harits', kelas_8a, halaqoh_2, 'Aktif'),
    ('S2024006', 'Bilal Ramadhan', 'Laki-laki', 'Sumenep', '2009-04-05', 'Ibrahim', kelas_8a, halaqoh_1, 'Aktif'),
    ('S2024007', 'Hamzah Al-Madani', 'Laki-laki', 'Sampang', '2010-01-20', 'H. Madani', kelas_7b, halaqoh_2, 'Aktif'),
    ('S2024008', 'Yusuf Al-Qaradhawi', 'Laki-laki', 'Pamekasan', '2009-09-12', 'H. Ahmad', kelas_8a, halaqoh_1, 'Aktif')
    ON CONFLICT (nis) DO NOTHING;
END $$;

-- Sample Hafalan
DO $$
DECLARE
    s1 UUID; s2 UUID; s3 UUID; s4 UUID;
BEGIN
    SELECT id INTO s1 FROM santri WHERE nis = 'S2024001' LIMIT 1;
    SELECT id INTO s2 FROM santri WHERE nis = 'S2024002' LIMIT 1;
    SELECT id INTO s3 FROM santri WHERE nis = 'S2024003' LIMIT 1;
    SELECT id INTO s4 FROM santri WHERE nis = 'S2024004' LIMIT 1;
    
    IF s1 IS NOT NULL THEN
        INSERT INTO hafalan (santri_id, juz, surah, ayat_mulai, ayat_selesai, status, tanggal) VALUES
        (s1, 30, 'An-Naba', 1, 40, 'Mutqin', '2024-09-15'),
        (s1, 30, 'An-Naziat', 1, 46, 'Mutqin', '2024-10-01'),
        (s1, 30, 'Abasa', 1, 42, 'Proses', '2024-11-10'),
        (s2, 30, 'An-Naba', 1, 40, 'Mutqin', '2024-09-20'),
        (s2, 30, 'An-Naziat', 1, 46, 'Proses', '2024-10-15'),
        (s3, 30, 'An-Naba', 1, 40, 'Proses', '2024-10-01'),
        (s4, 30, 'An-Naba', 1, 20, 'Proses', '2024-11-01')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Selesai!
SELECT 'Sample data berhasil ditambahkan!' as message;
