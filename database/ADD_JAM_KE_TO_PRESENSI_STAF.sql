-- =====================================================
-- MIGRATION: ADD JAM_KE & FOOLPROOF POLICIES TO PRESENSI_STAF
-- =====================================================
-- Deskripsi:
-- 1. Menambahkan kolom jam_ke pada presensi_staf (jika belum ada)
-- 2. Membuka akses SELECT, INSERT, UPDATE untuk authenticated
--    agar riwayat scan staf, musyrif, guru, dan admin tersimpan dan terbaca 100% tanpa hambatan RLS.
-- =====================================================

BEGIN;

-- 1. Tambah kolom jam_ke & jadwal_id jika belum ada
ALTER TABLE public.presensi_staf ADD COLUMN IF NOT EXISTS jam_ke INT;
ALTER TABLE public.presensi_staf ADD COLUMN IF NOT EXISTS jadwal_id UUID REFERENCES public.jadwal_pelajaran(id) ON DELETE CASCADE;

-- Index untuk mempercepat query pencocokan jadwal
CREATE INDEX IF NOT EXISTS idx_presensi_staf_staf_tanggal_jam 
ON public.presensi_staf(staf_id, tanggal, jam_ke);

CREATE INDEX IF NOT EXISTS idx_presensi_staf_jadwal_id 
ON public.presensi_staf(jadwal_id);

CREATE INDEX IF NOT EXISTS idx_presensi_staf_tanggal 
ON public.presensi_staf(tanggal);

-- 2. Pastikan RLS aktif
ALTER TABLE public.presensi_staf ENABLE ROW LEVEL SECURITY;

-- 3. Kebijakan SELECT Terbuka untuk seluruh pengguna terotentikasi (Guru, Musyrif, Admin)
DROP POLICY IF EXISTS "Presensi Staf viewable by admin" ON public.presensi_staf;
DROP POLICY IF EXISTS "Presensi Staf viewable by staff or admin" ON public.presensi_staf;
DROP POLICY IF EXISTS "presensi_staf_select_admin_absensi" ON public.presensi_staf;
DROP POLICY IF EXISTS "presensi_staf_select_policy" ON public.presensi_staf;

CREATE POLICY "presensi_staf_select_policy" 
ON public.presensi_staf FOR SELECT 
TO authenticated
USING (true);

-- 4. Kebijakan INSERT untuk seluruh pengguna terotentikasi
DROP POLICY IF EXISTS "Presensi Staf insertable by authenticated" ON public.presensi_staf;
CREATE POLICY "Presensi Staf insertable by authenticated" 
ON public.presensi_staf FOR INSERT 
TO authenticated
WITH CHECK (true);

-- 5. Kebijakan UPDATE untuk seluruh pengguna terotentikasi
DROP POLICY IF EXISTS "Presensi Staf updatable by authenticated" ON public.presensi_staf;
DROP POLICY IF EXISTS "presensi_staf_update_admin_absensi" ON public.presensi_staf;
DROP POLICY IF EXISTS "presensi_staf_update_policy" ON public.presensi_staf;

CREATE POLICY "presensi_staf_update_policy" 
ON public.presensi_staf FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- 6. Hak Akses tabel
GRANT ALL ON public.presensi_staf TO authenticated;
GRANT ALL ON public.presensi_staf TO service_role;

COMMIT;

SELECT '✅ Migrasi presensi_staf jam_ke & policies berhasil diterapkan!' as status;
