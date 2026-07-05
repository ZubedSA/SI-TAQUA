-- =====================================================
-- MIGRATION: FIX STAFF ATTENDANCE RLS & POLICIES
-- =====================================================

BEGIN;

-- Pastikan tabel ada
CREATE TABLE IF NOT EXISTS public.presensi_staf (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staf_id UUID REFERENCES public.guru(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    tipe TEXT NOT NULL,
    referensi_id UUID,
    waktu_scan TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tambah policy UPDATE (diperlukan untuk .upsert() meskipun tanpa ID)
DROP POLICY IF EXISTS "Presensi Staf updatable by authenticated" ON public.presensi_staf;
CREATE POLICY "Presensi Staf updatable by authenticated" 
ON public.presensi_staf FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Pastikan policy SELECT untuk admin juga mencakup role guru jika ingin self-check
DROP POLICY IF EXISTS "Presensi Staf viewable by staff or admin" ON public.presensi_staf;
CREATE POLICY "Presensi Staf viewable by staff or admin" 
ON public.presensi_staf FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND (role IN ('admin', 'guru') OR 'admin' = ANY(roles) OR 'guru' = ANY(roles))
    )
);

COMMIT;

SELECT '✅ Perbaikan RLS Presensi Staf Berhasil!' as status;
