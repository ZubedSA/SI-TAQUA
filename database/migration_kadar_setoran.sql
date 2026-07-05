-- Migration: Tambah kolom kadar_setoran di tabel hafalan
-- Jalankan SQL ini di Supabase SQL Editor

-- 1. Tambah kolom kadar_setoran
ALTER TABLE hafalan 
ADD COLUMN IF NOT EXISTS kadar_setoran VARCHAR(50) DEFAULT '1 Halaman';

-- 2. Update existing records dengan default value
UPDATE hafalan 
SET kadar_setoran = '1 Halaman' 
WHERE kadar_setoran IS NULL;

-- 3. Verifikasi kolom berhasil ditambahkan
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'hafalan' AND column_name = 'kadar_setoran';
