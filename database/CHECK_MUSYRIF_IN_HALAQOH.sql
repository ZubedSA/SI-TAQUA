-- ============================================
-- DIAGNOSA: CEK MUSYRIF DI HALAQOH
-- Jalankan di Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Lihat semua halaqoh dan musyrifnya
SELECT 
    h.id,
    h.nama as halaqoh_nama,
    h.musyrif_id,
    g.nama as musyrif_nama
FROM halaqoh h
LEFT JOIN guru g ON h.musyrif_id = g.id
ORDER BY h.nama;

-- 2. Test RPC function
SELECT * FROM get_halaqoh_names(
    ARRAY['df6c7cc8-0d9d-41b0-a47b-98ac541d3bd0']::UUID[]  -- Imam Ibnu Katsir Al-Makki
);
