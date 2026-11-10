-- =============================================================================
-- FINAL QUICK FIX (JALANKAN DI SUPABASE SQL EDITOR DEV)
-- =============================================================================

-- 1. Lepas check constraint presensi_mapel_detil agar seluruh ribuan data detil masuk
ALTER TABLE presensi_mapel_detil DROP CONSTRAINT IF EXISTS presensi_mapel_detil_status_check;

-- 2. Tambah kolom catatan_admin pada pergantian_jadwal
ALTER TABLE pergantian_jadwal ADD COLUMN IF NOT EXISTS catatan_admin TEXT;

-- 3. Kolom perilaku semester, ota, dan taujihad
ALTER TABLE perilaku_semester ADD COLUMN IF NOT EXISTS alpha_kelaas INT DEFAULT 0;
ALTER TABLE perilaku_semester ADD COLUMN IF NOT EXISTS alpha_kelas INT DEFAULT 0;
ALTER TABLE ota_pemasukan ADD COLUMN IF NOT EXISTS sumber VARCHAR(200);
ALTER TABLE ota_pemasukan ADD COLUMN IF NOT EXISTS nama_donatur VARCHAR(255);
ALTER TABLE taujihad ADD COLUMN IF NOT EXISTS catatan_wali TEXT;

-- 4. Paksa reload schema cache Supabase agar langsung mengenali kolom baru
NOTIFY pgrst, 'reload schema';
