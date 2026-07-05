-- ============================================
-- SCRIPT: CEK DATA MUSYRIF_HALAQOH
-- Jalankan di Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Cek apakah table musyrif_halaqoh ada
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'musyrif_halaqoh'
    )
    THEN '✅ Table musyrif_halaqoh EXISTS'
    ELSE '❌ Table musyrif_halaqoh TIDAK ADA - perlu jalankan migration_musyrif_role.sql'
    END as table_status;

-- 2. Lihat semua data di musyrif_halaqoh
SELECT 
    mh.id,
    mh.user_id,
    up.email as user_email,
    up.nama as user_name,
    array_to_string(up.roles, ', ') as user_roles,
    mh.halaqoh_id,
    h.nama as halaqoh_nama
FROM musyrif_halaqoh mh
LEFT JOIN user_profiles up ON mh.user_id = up.user_id
LEFT JOIN halaqoh h ON mh.halaqoh_id = h.id
ORDER BY up.nama;

-- 3. Lihat semua user dengan role 'musyrif'
SELECT 
    up.user_id,
    up.email,
    up.nama,
    array_to_string(up.roles, ', ') as roles,
    CASE WHEN EXISTS (
        SELECT 1 FROM musyrif_halaqoh mh WHERE mh.user_id = up.user_id
    )
    THEN '✅ Sudah terhubung halaqoh'
    ELSE '❌ BELUM terhubung halaqoh'
    END as halaqoh_status
FROM user_profiles up
WHERE 'musyrif' = ANY(up.roles)
ORDER BY up.nama;

-- 4. Lihat semua halaqoh yang tersedia
SELECT id, nama FROM halaqoh ORDER BY nama;

-- ============================================
-- JIKA DATA KOSONG, JALANKAN INI UNTUK TEST:
-- (Ganti UUID sesuai data Anda dari query #3 dan #4)
-- ============================================

-- INSERT INTO musyrif_halaqoh (user_id, halaqoh_id)
-- VALUES (
--     'USER_ID_MUSYRIF_ANDA',  -- dari query #3
--     'HALAQOH_ID_PILIHAN'     -- dari query #4
-- );
