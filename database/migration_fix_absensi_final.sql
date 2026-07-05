-- =====================================================
-- MIGRATION: FIX ABSENSI & STAFF PRESENCE
-- =====================================================

BEGIN;

-- 1. Perbaiki Tabel presensi (Santri)
-- Tambah kolom jam_ke jika belum ada
ALTER TABLE public.presensi ADD COLUMN IF NOT EXISTS jam_ke INT DEFAULT 1;

-- Update Index Unik agar memperbolehkan multiple session (berdasarkan jam_ke)
-- Hapus index lama jika ada
DROP INDEX IF EXISTS public.idx_presensi_santri_tanggal;

-- Buat index unik baru yang mencakup jam_ke
-- Ini memungkinkan santri punya record Hadir di Jam 1 (Quraniyah) dan Jam 2 (Madrosah)
CREATE UNIQUE INDEX idx_presensi_santri_tanggal_jam ON public.presensi(santri_id, tanggal, jam_ke);

-- 2. Buat Tabel presensi_staf (Kehadiran Pengajar)
CREATE TABLE IF NOT EXISTS public.presensi_staf (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staf_id UUID REFERENCES public.guru(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    tipe TEXT NOT NULL, -- 'MADROSAH' atau 'QURANIYAH'
    referensi_id UUID,  -- kelas_id atau halaqoh_id
    waktu_scan TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_presensi_staf_staf_id ON public.presensi_staf(staf_id);
CREATE INDEX IF NOT EXISTS idx_presensi_staf_tanggal ON public.presensi_staf(tanggal);

-- 3. Enable RLS & Policies untuk presensi_staf
ALTER TABLE public.presensi_staf ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Presensi Staf viewable by admin" ON public.presensi_staf;
CREATE POLICY "Presensi Staf viewable by admin" 
ON public.presensi_staf FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND (role = 'admin' OR 'admin' = ANY(roles))
    )
);

DROP POLICY IF EXISTS "Presensi Staf insertable by authenticated" ON public.presensi_staf;
CREATE POLICY "Presensi Staf insertable by authenticated" 
ON public.presensi_staf FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.presensi_staf TO authenticated;
GRANT ALL ON public.presensi_staf TO service_role;

COMMIT;

SELECT '✅ Migrasi Absensi Berhasil!' as status;
