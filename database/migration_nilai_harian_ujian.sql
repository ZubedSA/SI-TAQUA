-- ====================================================================
-- Migration: Add Nilai Columns & Adjust Unique Constraint for Multi-Row / Single-Row
-- Jalankan skrip ini di SQL Editor Supabase untuk memperbarui constraint
-- ====================================================================

-- 1. Tambah kolom nilai_harian, nilai_ujian, dan nilai_raport jika belum ada
ALTER TABLE nilai 
ADD COLUMN IF NOT EXISTS nilai_harian DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS nilai_ujian DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS nilai_raport DECIMAL(5,2);

-- 2. Hapus constraint lama yang membatasi 1 baris per santri+mapel+semester
ALTER TABLE nilai DROP CONSTRAINT IF EXISTS nilai_santri_id_mapel_id_semester_id_key;

-- 3. Tambahkan constraint baru yang mengizinkan baris harian dan ujian terpisah
ALTER TABLE nilai DROP CONSTRAINT IF EXISTS nilai_santri_mapel_semester_jenis_key;
ALTER TABLE nilai ADD CONSTRAINT nilai_santri_mapel_semester_jenis_key UNIQUE (santri_id, mapel_id, semester_id, jenis_ujian);
