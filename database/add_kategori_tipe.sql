-- ================================================
-- MIGRATION: Add tipe column to kategori_pembayaran
-- Jalankan SQL ini di Supabase SQL Editor
-- ================================================

-- Step 1: Add tipe column to kategori_pembayaran
ALTER TABLE kategori_pembayaran 
ADD COLUMN IF NOT EXISTS tipe VARCHAR(20) DEFAULT 'pembayaran' 
CHECK (tipe IN ('pemasukan', 'pengeluaran', 'pembayaran'));

-- Step 2: Update existing data with default tipe
UPDATE kategori_pembayaran SET tipe = 'pembayaran' WHERE tipe IS NULL;

-- Step 3: Add some default categories for pemasukan and pengeluaran
INSERT INTO kategori_pembayaran (nama, keterangan, tipe, is_active) VALUES
('Infaq', 'Infaq dari donatur', 'pemasukan', true),
('Sedekah', 'Sedekah dari masyarakat', 'pemasukan', true),
('Wakaf', 'Dana wakaf', 'pemasukan', true),
('Donasi', 'Donasi umum', 'pemasukan', true),
('Listrik', 'Pembayaran listrik bulanan', 'pengeluaran', true),
('Air', 'Pembayaran air bulanan', 'pengeluaran', true),
('Transport', 'Biaya transportasi', 'pengeluaran', true),
('Konsumsi', 'Biaya konsumsi/makan', 'pengeluaran', true),
('Perawatan', 'Biaya perawatan gedung', 'pengeluaran', true),
('Operasional', 'Biaya operasional lainnya', 'pengeluaran', true)
ON CONFLICT DO NOTHING;

-- ================================================
-- DONE! Refresh halaman setelah menjalankan SQL ini
-- ================================================
