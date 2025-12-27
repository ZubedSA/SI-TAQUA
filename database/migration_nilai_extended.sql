-- =====================================================
-- Migration: Extend nilai table for academic assessment
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add new columns to nilai table for comprehensive academic assessment
ALTER TABLE nilai 
ADD COLUMN IF NOT EXISTS semester_id UUID REFERENCES semester(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS jenis_ujian VARCHAR(50) DEFAULT 'semester' CHECK (jenis_ujian IN ('syahri', 'semester', 'harian', 'uts', 'uas')),
ADD COLUMN IF NOT EXISTS kategori VARCHAR(50) DEFAULT 'Madrosiyah' CHECK (kategori IN ('Tahfizhiyah', 'Madrosiyah')),
ADD COLUMN IF NOT EXISTS bulan INTEGER CHECK (bulan BETWEEN 1 AND 12),
ADD COLUMN IF NOT EXISTS tahun INTEGER,
ADD COLUMN IF NOT EXISTS tanggal DATE,
ADD COLUMN IF NOT EXISTS nilai_hafalan DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS nilai_tajwid DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS nilai_kelancaran DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS nilai_murajaah DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS catatan TEXT;

-- Make mapel_id nullable (for Tahfizhiyah which doesn't use mapel)
ALTER TABLE nilai ALTER COLUMN mapel_id DROP NOT NULL;

-- Drop old unique constraint if exists
ALTER TABLE nilai DROP CONSTRAINT IF EXISTS nilai_santri_id_mapel_id_semester_tahun_ajaran_key;

-- Create new indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_nilai_semester_id ON nilai(semester_id);
CREATE INDEX IF NOT EXISTS idx_nilai_jenis_ujian ON nilai(jenis_ujian);
CREATE INDEX IF NOT EXISTS idx_nilai_kategori ON nilai(kategori);
CREATE INDEX IF NOT EXISTS idx_nilai_bulan_tahun ON nilai(bulan, tahun);

-- Add comment for documentation
COMMENT ON COLUMN nilai.jenis_ujian IS 'syahri=monthly, semester=semester, harian=daily, uts=midterm, uas=final';
COMMENT ON COLUMN nilai.kategori IS 'Tahfizhiyah=Quran memorization, Madrosiyah=General subjects';
