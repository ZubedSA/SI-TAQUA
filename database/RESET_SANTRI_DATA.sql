-- =====================================================
-- RESET: HAPUS SEMUA DATA SANTRI
-- Jalankan ini untuk menghapus semua data santri
-- agar bisa import ulang dengan bersih
-- =====================================================

-- Hapus semua data santri
DELETE FROM santri;

-- Optional: Reset angkatan juga jika ingin mulai dari nol
-- DELETE FROM angkatan;

-- Verifikasi
SELECT 
    (SELECT count(*) FROM santri) AS santri_count,
    (SELECT count(*) FROM angkatan) AS angkatan_count;
