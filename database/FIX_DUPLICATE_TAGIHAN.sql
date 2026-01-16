-- ============================================================
-- HAPUS PEMBAYARAN DUPLIKAT LANGSUNG
-- Script ini menghapus pembayaran yang duplikat (santri sama, 
-- tanggal sama, jumlah sama, kategori sama)
-- ============================================================

-- STEP 1: Lihat pembayaran duplikat
SELECT 
    ps.id,
    ps.santri_id,
    s.nama AS santri_nama,
    ps.tanggal,
    ps.jumlah,
    ps.metode,
    ts.kategori_id
FROM pembayaran_santri ps
JOIN santri s ON ps.santri_id = s.id
JOIN tagihan_santri ts ON ps.tagihan_id = ts.id
ORDER BY s.nama, ps.tanggal, ts.kategori_id;

-- ============================================================
-- STEP 2: Hapus pembayaran duplikat (menyisakan yang pertama)
-- ============================================================
WITH ranked_payments AS (
    SELECT 
        ps.id,
        ps.santri_id,
        ps.tanggal,
        ps.jumlah,
        ts.kategori_id,
        ROW_NUMBER() OVER (
            PARTITION BY ps.santri_id, ps.tanggal, ps.jumlah, ts.kategori_id
            ORDER BY ps.created_at ASC
        ) AS rn
    FROM pembayaran_santri ps
    JOIN tagihan_santri ts ON ps.tagihan_id = ts.id
)
DELETE FROM pembayaran_santri 
WHERE id IN (
    SELECT id FROM ranked_payments WHERE rn > 1
);

-- ============================================================
-- STEP 3: Hapus tagihan duplikat (menyisakan yang pertama)
-- ============================================================
WITH ranked_tagihan AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY santri_id, kategori_id, jatuh_tempo
            ORDER BY created_at ASC
        ) AS rn
    FROM tagihan_santri
)
DELETE FROM tagihan_santri 
WHERE id IN (
    SELECT id FROM ranked_tagihan WHERE rn > 1
);

-- ============================================================
-- STEP 4: Verifikasi pembayaran (cek tidak ada duplikat)
-- ============================================================
SELECT 
    s.nama AS santri_nama,
    ps.tanggal,
    ps.jumlah,
    COUNT(*) AS jumlah_record
FROM pembayaran_santri ps
JOIN santri s ON ps.santri_id = s.id
JOIN tagihan_santri ts ON ps.tagihan_id = ts.id
GROUP BY ps.santri_id, s.nama, ps.tanggal, ps.jumlah, ts.kategori_id
HAVING COUNT(*) > 1;
