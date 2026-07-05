-- Migration: Add columns for Ujian Syahri enhancements
-- Run this in Supabase SQL Editor

-- Add jumlah_hafalan column (in juz)
ALTER TABLE nilai ADD COLUMN IF NOT EXISTS jumlah_hafalan INTEGER DEFAULT 0;

-- Add penguji_id column (references guru table)
ALTER TABLE nilai ADD COLUMN IF NOT EXISTS penguji_id UUID REFERENCES guru(id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_nilai_penguji ON nilai(penguji_id);

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'nilai' 
AND column_name IN ('jumlah_hafalan', 'penguji_id');
