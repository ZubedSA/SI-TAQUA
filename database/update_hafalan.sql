-- Update tabel hafalan untuk fitur baru
-- Tambah kolom jenis (Setoran/Muroja'ah)
ALTER TABLE hafalan ADD COLUMN IF NOT EXISTS jenis VARCHAR(20) DEFAULT 'Setoran';

-- Tambah kolom penguji_id (foreign key ke guru)
ALTER TABLE hafalan ADD COLUMN IF NOT EXISTS penguji_id UUID REFERENCES guru(id);

-- Update status options
-- Status yang tersedia: 'Lancar', 'Mutqin', 'Perlu Perbaikan'
UPDATE hafalan SET status = 'Lancar' WHERE status = 'Proses';
UPDATE hafalan SET status = 'Perlu Perbaikan' WHERE status = 'Belum';
