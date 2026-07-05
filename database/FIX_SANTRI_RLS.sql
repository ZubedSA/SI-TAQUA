-- ============================================
-- FIX: SANTRI TABLE RLS
-- Jalankan di Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Pastikan RLS enabled
ALTER TABLE santri ENABLE ROW LEVEL SECURITY;

-- 2. Hapus policy SELECT yang ada (untuk refresh)
DROP POLICY IF EXISTS "santri_select_policy" ON santri;
DROP POLICY IF EXISTS "santri_allow_select" ON santri;
DROP POLICY IF EXISTS "santri_read_all" ON santri;

-- 3. Buat policy SELECT untuk semua authenticated user
--    Kita bebaskan SELECT karena filter dilakukan di frontend/query
CREATE POLICY "santri_allow_select" ON santri
FOR SELECT
TO authenticated
USING (true);

-- 4. Policy Admin (Full Access)
CREATE POLICY "santri_admin_full" ON santri
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND ('admin' = ANY(roles) OR role = 'admin')
    )
);

SELECT '✅ SANTRI RLS FIX COMPLETE!' as status;
