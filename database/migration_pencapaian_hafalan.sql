-- Migration: Update tabel pencapaian_hafalan untuk mendukung kategori periode
-- Jalankan SQL ini di Supabase SQL Editor

-- 1. Tambah kolom kategori jika belum ada
ALTER TABLE pencapaian_hafalan 
ADD COLUMN IF NOT EXISTS kategori VARCHAR(20) DEFAULT 'semester';

-- 2. Tambah kolom periode untuk menyimpan key unik periode
ALTER TABLE pencapaian_hafalan 
ADD COLUMN IF NOT EXISTS periode VARCHAR(100);

-- 3. Tambah kolom tanggal_dari untuk filter mingguan
ALTER TABLE pencapaian_hafalan 
ADD COLUMN IF NOT EXISTS tanggal_dari DATE;

-- 4. Tambah kolom tanggal_sampai untuk filter mingguan
ALTER TABLE pencapaian_hafalan 
ADD COLUMN IF NOT EXISTS tanggal_sampai DATE;

-- 5. Tambah kolom bulan untuk filter bulanan
ALTER TABLE pencapaian_hafalan 
ADD COLUMN IF NOT EXISTS bulan VARCHAR(2);

-- 6. Buat index untuk query yang lebih cepat
CREATE INDEX IF NOT EXISTS idx_pencapaian_kategori ON pencapaian_hafalan(kategori);
CREATE INDEX IF NOT EXISTS idx_pencapaian_periode ON pencapaian_hafalan(periode);
CREATE INDEX IF NOT EXISTS idx_pencapaian_semester ON pencapaian_hafalan(semester_id);
CREATE INDEX IF NOT EXISTS idx_pencapaian_bulan ON pencapaian_hafalan(bulan);

-- 7. Verifikasi kolom berhasil ditambahkan
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'pencapaian_hafalan'
ORDER BY ordinal_position;
