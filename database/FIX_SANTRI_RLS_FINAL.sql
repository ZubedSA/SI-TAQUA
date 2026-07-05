-- ============================================
-- FIX: SANTRI RLS POLICIES FOR MUSYRIF
-- Issue: Musyrif cannot add/remove santri (update halaqoh_id)
-- ============================================

-- 1. Enable RLS (just in case)
ALTER TABLE santri ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies for santri
DROP POLICY IF EXISTS "santri_select_all" ON santri;
DROP POLICY IF EXISTS "santri_insert_admin" ON santri;
DROP POLICY IF EXISTS "santri_update_admin" ON santri;
DROP POLICY IF EXISTS "santri_delete_admin" ON santri;
DROP POLICY IF EXISTS "Allow all access" ON santri;
DROP POLICY IF EXISTS "musyrif_update_santri" ON santri;
DROP POLICY IF EXISTS "musyrif_select_santri" ON santri;

-- 3. Create comprehensive policies

-- A. SELECT: Allow everyone (authenticated) to view santri
-- Use 'true' to allow global read access for now to prevent "invisible data" issues
CREATE POLICY "santri_select_all" ON santri
FOR SELECT
TO authenticated
USING (true);

-- B. INSERT/DELETE: Admin only (typically)
CREATE POLICY "santri_insert_admin" ON santri
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND ('admin' = ANY(roles) OR role = 'admin')
    )
);

CREATE POLICY "santri_delete_admin" ON santri
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND ('admin' = ANY(roles) OR role = 'admin')
    )
);

-- C. UPDATE: Admin + Musyrif (Critical Fix)
-- Musyrif needs to update halaqoh_id to add/remove members.
-- We allow Musyrif to update ANY santri for now to ensure they can onboard students.
-- (Refining to "only santri in their halaqoh" causes catch-22 for new members)

CREATE POLICY "santri_update_musyrif_admin" ON santri
FOR UPDATE
TO authenticated
USING (
    -- 1. Is Admin
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND ('admin' = ANY(roles) OR role = 'admin')
    )
    OR
    -- 2. Is Musyrif (Allow updating santri data generally)
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND ('musyrif' = ANY(roles) OR role = 'musyrif')
    )
);

SELECT '✅ RLS policies untuk santri sudah di-fix!' as status;
