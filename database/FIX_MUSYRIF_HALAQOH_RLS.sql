-- ============================================
-- FIX: MUSYRIF_HALAQOH RLS POLICIES
-- Jalankan di Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Drop semua policy lama
DROP POLICY IF EXISTS "musyrif_halaqoh_select_all" ON musyrif_halaqoh;
DROP POLICY IF EXISTS "musyrif_halaqoh_admin_insert" ON musyrif_halaqoh;
DROP POLICY IF EXISTS "musyrif_halaqoh_admin_update" ON musyrif_halaqoh;
DROP POLICY IF EXISTS "musyrif_halaqoh_admin_delete" ON musyrif_halaqoh;
DROP POLICY IF EXISTS "service_role_all" ON musyrif_halaqoh;
DROP POLICY IF EXISTS "allow_all_select" ON musyrif_halaqoh;
DROP POLICY IF EXISTS "Allow all access" ON musyrif_halaqoh;

-- 2. Buat policy SELECT yang pasti bekerja
CREATE POLICY "allow_all_select" ON musyrif_halaqoh
FOR SELECT
USING (true);

-- 3. Buat policy untuk admin (insert/update/delete)
CREATE POLICY "admin_full_access" ON musyrif_halaqoh
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND ('admin' = ANY(roles) OR role = 'admin')
    )
);

SELECT '✅ RLS policies untuk musyrif_halaqoh sudah di-fix!' as status;

-- 4. Verifikasi: Cek data
SELECT 
    mh.user_id,
    up.email,
    up.nama,
    h.nama as halaqoh_nama
FROM musyrif_halaqoh mh
LEFT JOIN user_profiles up ON mh.user_id = up.user_id
LEFT JOIN halaqoh h ON mh.halaqoh_id = h.id;
