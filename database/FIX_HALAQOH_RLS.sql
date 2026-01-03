-- ============================================
-- FIX: HALAQOH TABLE RLS - COMPLETE FIX
-- Jalankan di Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Lihat policy yang ada sekarang
SELECT 
    policyname, 
    cmd,
    permissive,
    qual
FROM pg_policies 
WHERE tablename = 'halaqoh';

-- 2. Hapus SEMUA policy yang ada
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'halaqoh'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON halaqoh';
    END LOOP;
END $$;

-- 3. Pastikan RLS enabled
ALTER TABLE halaqoh ENABLE ROW LEVEL SECURITY;

-- 4. Buat policy SELECT yang PASTI bekerja untuk SEMUA authenticated user
CREATE POLICY "halaqoh_public_read" ON halaqoh
FOR SELECT
TO authenticated
USING (true);

-- 5. Buat policy untuk admin (insert/update/delete)
CREATE POLICY "halaqoh_admin_write" ON halaqoh
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND ('admin' = ANY(roles) OR role = 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND ('admin' = ANY(roles) OR role = 'admin')
    )
);

-- 6. Verifikasi policy baru
SELECT 
    policyname, 
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'halaqoh';

SELECT '✅ HALAQOH RLS FIX COMPLETE!' as status;

-- 7. Test: Cek apakah data bisa diakses
SELECT id, nama FROM halaqoh LIMIT 3;
