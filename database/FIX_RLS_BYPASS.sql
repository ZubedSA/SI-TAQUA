-- FIX RLS USING SECURITY DEFINER FUNCTION
-- Since we cannot modify 'users' table permissions directly, we will use a function
-- that runs with 'postgres' permissions (SECURITY DEFINER) to check the user role.

-- 1. Create is_admin() function to check role securely
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- 2. Grant execute permission to everyone
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin TO anon;

-- 3. Update Santri Policies to use the function
DROP POLICY IF EXISTS "Admin can delete santri" ON santri;
CREATE POLICY "Admin can delete santri" ON santri FOR DELETE TO authenticated
USING ( is_admin() );

DROP POLICY IF EXISTS "Admin can update santri" ON santri;
CREATE POLICY "Admin can update santri" ON santri FOR UPDATE TO authenticated
USING ( is_admin() ) WITH CHECK ( is_admin() );

DROP POLICY IF EXISTS "Admin can insert santri" ON santri;
CREATE POLICY "Admin can insert santri" ON santri FOR INSERT TO authenticated
WITH CHECK ( is_admin() );

-- 4. Update Guru Policies to use the function
DROP POLICY IF EXISTS "Admin can delete guru" ON guru;
CREATE POLICY "Admin can delete guru" ON guru FOR DELETE TO authenticated
USING ( is_admin() );

DROP POLICY IF EXISTS "Admin can update guru" ON guru;
CREATE POLICY "Admin can update guru" ON guru FOR UPDATE TO authenticated
USING ( is_admin() ) WITH CHECK ( is_admin() );

DROP POLICY IF EXISTS "Admin can insert guru" ON guru;
CREATE POLICY "Admin can insert guru" ON guru FOR INSERT TO authenticated
WITH CHECK ( is_admin() );
