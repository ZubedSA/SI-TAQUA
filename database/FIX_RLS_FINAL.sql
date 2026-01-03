-- FIX RLS FINAL: Use user_profiles table
-- The previous error confirmed 'public.users' does not exist. 
-- The correct table for user roles is 'public.user_profiles'.

-- 1. Create is_admin() function using user_profiles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND (
      role = 'admin' OR 
      active_role = 'admin' OR
      (roles IS NOT NULL AND 'admin' = ANY(roles))
    )
  );
$$;

-- 2. Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin TO anon;

-- 3. Update Santri Policies
DROP POLICY IF EXISTS "Admin can delete santri" ON santri;
CREATE POLICY "Admin can delete santri" ON santri FOR DELETE TO authenticated
USING ( is_admin() );

DROP POLICY IF EXISTS "Admin can update santri" ON santri;
CREATE POLICY "Admin can update santri" ON santri FOR UPDATE TO authenticated
USING ( is_admin() ) WITH CHECK ( is_admin() );

DROP POLICY IF EXISTS "Admin can insert santri" ON santri;
CREATE POLICY "Admin can insert santri" ON santri FOR INSERT TO authenticated
WITH CHECK ( is_admin() );

-- 4. Update Guru Policies
DROP POLICY IF EXISTS "Admin can delete guru" ON guru;
CREATE POLICY "Admin can delete guru" ON guru FOR DELETE TO authenticated
USING ( is_admin() );

DROP POLICY IF EXISTS "Admin can update guru" ON guru;
CREATE POLICY "Admin can update guru" ON guru FOR UPDATE TO authenticated
USING ( is_admin() ) WITH CHECK ( is_admin() );

DROP POLICY IF EXISTS "Admin can insert guru" ON guru;
CREATE POLICY "Admin can insert guru" ON guru FOR INSERT TO authenticated
WITH CHECK ( is_admin() );
