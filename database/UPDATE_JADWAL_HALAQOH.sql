-- =============================================
-- UPDATE JADWAL PELAJARAN & PRESENSI MAPEL
-- Menambahkan kolom halaqoh_id dan tipe
-- =============================================

-- 1. Update table jadwal_pelajaran
-- Menambahkan tipe (MADROSAH/HALAQOH) dan halaqoh_id
ALTER TABLE jadwal_pelajaran 
ADD COLUMN IF NOT EXISTS tipe VARCHAR(20) DEFAULT 'MADROSAH',
ADD COLUMN IF NOT EXISTS halaqoh_id UUID REFERENCES halaqoh(id) ON DELETE CASCADE;

-- 2. Update table presensi_mapel (Jurnal Guru)
-- Agar konsisten dengan jadwal, presensi_mapel juga perlu halaqoh_id
ALTER TABLE presensi_mapel 
ADD COLUMN IF NOT EXISTS halaqoh_id UUID REFERENCES halaqoh(id) ON DELETE CASCADE;

-- 3. Update data lama (jika ada)
UPDATE jadwal_pelajaran SET tipe = 'MADROSAH' WHERE tipe IS NULL;

-- 4. Reload Schema Cache 
-- Jalankan ini jika kolom masih belum terdeteksi setelah alter table
NOTIFY pgrst, 'reload schema';

-- Verifikasi Kolom
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'jadwal_pelajaran' 
AND column_name IN ('tipe', 'halaqoh_id');
