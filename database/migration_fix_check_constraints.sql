-- =====================================================
-- MIGRATION: FIX ATTENDANCE CHECK CONSTRAINTS
-- =====================================================
-- Deskripsi: 
-- Mengatasi kegagalan penyimpanan absensi karena adanya pilihan 
-- status baru seperti 'Pulang' dan 'Terlambat' di frontend, serta
-- perbedaan format Case (Title Case vs Lowercase) antara 
-- form penginputan dengan check constraint di database Supabase.

BEGIN;

-- 1. Perbaiki Check Constraint pada tabel presensi_mapel_detil
-- Hapus constraint yang lama jika ada
ALTER TABLE public.presensi_mapel_detil 
DROP CONSTRAINT IF EXISTS presensi_mapel_detil_status_check;

-- Tambahkan constraint baru yang mendukung 'Pulang' dan toleran terhadap variasi case
ALTER TABLE public.presensi_mapel_detil 
ADD CONSTRAINT presensi_mapel_detil_status_check 
CHECK (status IN (
    'Hadir', 'Izin', 'Sakit', 'Alfa', 'Terlambat', 'Pulang',
    'hadir', 'izin', 'sakit', 'alfa', 'terlambat', 'pulang'
));

-- 2. Perbaiki Check Constraint pada tabel presensi (Tabel Sinkronisasi Utama)
-- Hapus constraint lama jika ada (bisa berupa presensi_status_check)
ALTER TABLE public.presensi 
DROP CONSTRAINT IF EXISTS presensi_status_check;

-- Tambahkan constraint baru yang mendukung semua opsi dan format case dari frontend
ALTER TABLE public.presensi 
ADD CONSTRAINT presensi_status_check 
CHECK (status IN (
    'hadir', 'izin', 'sakit', 'alfa', 'alpha', 'terlambat', 'pulang',
    'Hadir', 'Izin', 'Sakit', 'Alfa', 'Alpha', 'Terlambat', 'Pulang'
));

COMMIT;

SELECT '✅ Perbaikan check constraint absensi berhasil diterapkan!' as status;
