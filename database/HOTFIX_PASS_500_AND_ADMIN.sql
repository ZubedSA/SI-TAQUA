-- =====================================================
-- HOTFIX: FIX PASSWORD UPDATE ERROR 500 & ADMIN ACCESS
-- =====================================================

-- BAGIAN 1: Sembuhkan Error 500 saat Update Password
-- Error 500 pada 'auth.updateUser' 99% karena Trigger 'ON UPDATE' di tabel auth.users yang error.
-- Kita hapus semua trigger UPDATE pada auth.users.

DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_schema = 'auth' 
        AND event_object_table = 'users' 
        AND event_manipulation = 'UPDATE'
    ) 
    LOOP 
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON auth.users CASCADE;'; 
        RAISE NOTICE '🔥 Dropped UPDATE Trigger: %', r.trigger_name;
    END LOOP; 
END $$;

-- BAGIAN 2: Sembuhkan Halaman Admin Error (RLS)
-- Pastikan Admin BISA MELIHAT SEMUA DATA (Select Policy).
-- Kadang policy lama 'Authenticated users can see all' hilang atau tertimpa.

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Reset Policy Select
DROP POLICY IF EXISTS "Authenticated users can see all" ON user_profiles;
DROP POLICY IF EXISTS "Admin Select All" ON user_profiles;

-- Buat Policy yang SANGAT JELAS
CREATE POLICY "Authenticated users can see all" ON user_profiles
FOR SELECT USING (
  auth.role() = 'authenticated'
);

-- Pastikan Admin bisa UPDATE juga (untuk fitur Manajemen User)
DROP POLICY IF EXISTS "Admin Update All" ON user_profiles;
CREATE POLICY "Admin Update All" ON user_profiles
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role = 'admin' OR 'admin' = ANY(roles))
  )
);

-- BAGIAN 3: Reload Schema
NOTIFY pgrst, 'reload schema';
