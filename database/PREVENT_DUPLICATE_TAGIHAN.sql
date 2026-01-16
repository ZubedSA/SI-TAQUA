-- ============================================================
-- PENCEGAHAN DUPLIKASI TAGIHAN & PEMBAYARAN
-- Jalankan SETELAH data duplikat sudah dibersihkan
-- ============================================================

-- 1. Unique constraint pada tagihan_santri
-- Mencegah santri memiliki 2 tagihan dengan kategori + periode yang sama
ALTER TABLE tagihan_santri
DROP CONSTRAINT IF EXISTS unique_tagihan_per_santri_kategori_periode;

ALTER TABLE tagihan_santri
ADD CONSTRAINT unique_tagihan_per_santri_kategori_periode 
UNIQUE (santri_id, kategori_id, jatuh_tempo);

-- 2. Unique constraint pada pembayaran_santri  
-- Mencegah pembayaran duplikat untuk tagihan yang sama pada hari yang sama
ALTER TABLE pembayaran_santri
DROP CONSTRAINT IF EXISTS unique_pembayaran_per_tagihan_tanggal;

ALTER TABLE pembayaran_santri
ADD CONSTRAINT unique_pembayaran_per_tagihan_tanggal
UNIQUE (tagihan_id, tanggal, jumlah);

-- Verifikasi constraint berhasil ditambahkan
SELECT 
    tc.constraint_name,
    tc.table_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_name IN ('tagihan_santri', 'pembayaran_santri')
AND tc.constraint_type = 'UNIQUE';
