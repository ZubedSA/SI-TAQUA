-- =====================================================
-- PERFORMANCE OPTIMIZATION: GLOBAL DATABASE INDEXING
-- Part of: Supabase Performance Engineering Task
-- Description: Indices for Akademik, Keuangan, Pengurus, Users, and OTA
-- =====================================================

-- =====================================================
-- 1. MODUL AKADEMIK
-- =====================================================
-- Filter Indices
CREATE INDEX IF NOT EXISTS idx_santri_halaqoh_id ON santri(halaqoh_id);
CREATE INDEX IF NOT EXISTS idx_santri_kelas_id ON santri(kelas_id);
CREATE INDEX IF NOT EXISTS idx_santri_status ON santri(status);
CREATE INDEX IF NOT EXISTS idx_santri_nama ON santri USING btree (nama);

-- RLS Security Indices (Foreign Keys)
CREATE INDEX IF NOT EXISTS idx_hafalan_santri_id ON hafalan(santri_id);
CREATE INDEX IF NOT EXISTS idx_presensi_santri_id ON presensi(santri_id);
CREATE INDEX IF NOT EXISTS idx_nilai_santri_id ON nilai(santri_id);

-- Sorting Indices
CREATE INDEX IF NOT EXISTS idx_hafalan_tanggal ON hafalan(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_presensi_tanggal ON presensi(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_mapel_nama ON mapel(nama);
CREATE INDEX IF NOT EXISTS idx_halaqoh_nama ON halaqoh(nama);

-- =====================================================
-- 2. MODUL KEUANGAN
-- =====================================================
-- Laporan & Kas (Sorting by Date is critical)
CREATE INDEX IF NOT EXISTS idx_kas_pemasukan_tanggal ON kas_pemasukan(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_kas_pengeluaran_tanggal ON kas_pengeluaran(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_realisasi_dana_tanggal ON realisasi_dana(tanggal DESC);

-- Tagihan & Pembayaran
CREATE INDEX IF NOT EXISTS idx_tagihan_santri_santri_id ON tagihan_santri(santri_id);
CREATE INDEX IF NOT EXISTS idx_tagihan_santri_status ON tagihan_santri(status); -- Lunas/Belum
CREATE INDEX IF NOT EXISTS idx_pembayaran_tagihan_id ON pembayaran_santri(tagihan_id); -- Join performance
CREATE INDEX IF NOT EXISTS idx_pembayaran_tanggal ON pembayaran_santri(tanggal DESC);

-- Kategori & Anggaran
CREATE INDEX IF NOT EXISTS idx_kategori_pembayaran_tipe ON kategori_pembayaran(tipe); -- Dropdown filtering
CREATE INDEX IF NOT EXISTS idx_anggaran_created_at ON anggaran(created_at DESC);

-- =====================================================
-- 3. MODUL PENGURUS
-- =====================================================
-- Filtering Active Content
CREATE INDEX IF NOT EXISTS idx_informasi_active ON informasi_pondok(is_active);
CREATE INDEX IF NOT EXISTS idx_buletin_archived ON buletin_pondok(is_archived);
CREATE INDEX IF NOT EXISTS idx_pengumuman_archived ON pengumuman_internal(is_archived);
CREATE INDEX IF NOT EXISTS idx_informasi_created_at ON informasi_pondok(created_at DESC);

-- =====================================================
-- 4. MODUL ORANG TUA ASUH (OTA)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_orang_tua_asuh_status ON orang_tua_asuh(status); -- Active Donors
CREATE INDEX IF NOT EXISTS idx_ota_pemasukan_tanggal ON ota_pemasukan(tanggal DESC); -- Reports
CREATE INDEX IF NOT EXISTS idx_ota_pemasukan_ota_id ON ota_pemasukan(ota_id); -- Relation
CREATE INDEX IF NOT EXISTS idx_ota_penyaluran_tanggal ON ota_penyaluran(tanggal DESC); -- Reports
CREATE INDEX IF NOT EXISTS idx_ota_penyaluran_santri_id ON ota_penyaluran(santri_id); -- Relation

-- =====================================================
-- 5. MODUL USERS & SYSTEM
-- =====================================================
-- User Lookup (Critical for RLS get_user_role)
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_santri ON user_profiles(user_id, santri_id);

-- System Settings
-- System Settings
-- Table uses single row pattern, no specific lookup index needed beyond PK
-- CREATE INDEX IF NOT EXISTS idx_system_settings_updated_at ON system_settings(updated_at); -- Already in migration

-- Verification Query
SELECT 
    schemaname, 
    tablename, 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
