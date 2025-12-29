-- FIX_RELATIONS.sql
-- Script untuk memperbaiki relasi antar tabel agar data konsisten (Referential Integrity)
-- Menambahkan ON DELETE CASCADE: Jika data induk dihapus, data anak otomatis terhapus.

BEGIN;

-- 1. Tabel Hafalan -> Santri
ALTER TABLE hafalan
DROP CONSTRAINT IF EXISTS hafalan_santri_id_fkey;

ALTER TABLE hafalan
ADD CONSTRAINT hafalan_santri_id_fkey
FOREIGN KEY (santri_id)
REFERENCES santri(id)
ON DELETE CASCADE;

-- 2. Tabel Nilai -> Santri
ALTER TABLE nilai
DROP CONSTRAINT IF EXISTS nilai_santri_id_fkey;

ALTER TABLE nilai
ADD CONSTRAINT nilai_santri_id_fkey
FOREIGN KEY (santri_id)
REFERENCES santri(id)
ON DELETE CASCADE;

-- 3. Tabel Presensi -> Santri
ALTER TABLE presensi
DROP CONSTRAINT IF EXISTS presensi_santri_id_fkey;

ALTER TABLE presensi
ADD CONSTRAINT presensi_santri_id_fkey
FOREIGN KEY (santri_id)
REFERENCES santri(id)
ON DELETE CASCADE;

-- 4. Tabel Tagihan Santri -> Santri
-- Table name is 'tagihan_santri', NOT 'tagihan' based on frontend usage.
ALTER TABLE tagihan_santri
DROP CONSTRAINT IF EXISTS tagihan_santri_santri_id_fkey; 

-- Note: We try to drop common constraint names, but if it fails, user might need to check exact name.
-- We'll assume standard naming convention or try to add a new one if possible.
-- Safer to Drop existing constraint by name if known. 
-- However, we will proceed with ADD CONSTRAINT which might require dropping old one if name conflicts.

ALTER TABLE tagihan_santri
ADD CONSTRAINT tagihan_santri_santri_id_fkey
FOREIGN KEY (santri_id)
REFERENCES santri(id)
ON DELETE CASCADE;

-- 5. Tabel Pembayaran Santri -> Tagihan Santri
-- Table name is 'pembayaran_santri', NOT 'pembayaran'.
ALTER TABLE pembayaran_santri
DROP CONSTRAINT IF EXISTS pembayaran_santri_tagihan_id_fkey;

ALTER TABLE pembayaran_santri
ADD CONSTRAINT pembayaran_santri_tagihan_id_fkey
FOREIGN KEY (tagihan_id)
REFERENCES tagihan_santri(id)
ON DELETE CASCADE;

-- 6. Tabel Realisasi Dana -> Anggaran
ALTER TABLE realisasi_dana
DROP CONSTRAINT IF EXISTS realisasi_dana_anggaran_id_fkey;

ALTER TABLE realisasi_dana
ADD CONSTRAINT realisasi_dana_anggaran_id_fkey
FOREIGN KEY (anggaran_id)
REFERENCES anggaran(id)
ON DELETE CASCADE;

COMMIT;
