-- =====================================================
-- MASTER FIX: Disable RLS on ALL tables
-- Menghilangkan semua masalah "data tidak muncul"
-- Jalankan di Supabase SQL Editor
-- =====================================================

-- =====================================================
-- KEUANGAN / BENDAHARA TABLES
-- =====================================================
ALTER TABLE IF EXISTS kas_pemasukan DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS kas_pengeluaran DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS kas_saldo DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS kategori_pemasukan DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS kategori_pengeluaran DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tagihan DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pembayaran DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tagihan_santri DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- OTA TABLES
-- =====================================================
ALTER TABLE IF EXISTS orang_tua_asuh DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ota_pemasukan DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ota_pengeluaran DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ota_penyaluran DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ota_pool_dana DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ota_penyaluran_detail DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ota_santri DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS santri_penerima_ota DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS kategori_ota DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- USER & AUTH TABLES
-- =====================================================
ALTER TABLE IF EXISTS user_profiles DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- AKADEMIK TABLES
-- =====================================================
ALTER TABLE IF EXISTS santri DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS kelas DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS semester DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS mata_pelajaran DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS hafalan DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS guru DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS jadwal DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- PENGURUS TABLES
-- =====================================================
ALTER TABLE IF EXISTS pelanggaran DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pengumuman DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- RELOAD SCHEMA
-- =====================================================
NOTIFY pgrst, 'reload schema';

SELECT '✅ RLS DISABLED on ALL tables! Semua user bisa akses data.' as result;
