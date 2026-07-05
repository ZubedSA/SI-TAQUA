-- FIX ADMIN CRUD PERMISSIONS (RLS)

-- POLICY FOR SANTRI TABLE
-- Allow admins to DELETE
DROP POLICY IF EXISTS "Admin can delete santri" ON santri;
CREATE POLICY "Admin can delete santri"
ON santri FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'service_role' OR 
  (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin' OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Allow admins to UPDATE
DROP POLICY IF EXISTS "Admin can update santri" ON santri;
CREATE POLICY "Admin can update santri"
ON santri FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'service_role' OR 
  (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin' OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'service_role' OR 
  (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin' OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Allow admins to INSERT (usually allowed, but good to ensure)
DROP POLICY IF EXISTS "Admin can insert santri" ON santri;
CREATE POLICY "Admin can insert santri"
ON santri FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' = 'service_role' OR 
  (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin' OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- POLICY FOR GURU TABLE
-- Allow admins to DELETE
DROP POLICY IF EXISTS "Admin can delete guru" ON guru;
CREATE POLICY "Admin can delete guru"
ON guru FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'service_role' OR 
  (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin' OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Allow admins to UPDATE
DROP POLICY IF EXISTS "Admin can update guru" ON guru;
CREATE POLICY "Admin can update guru"
ON guru FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'service_role' OR 
  (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin' OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'service_role' OR 
  (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin' OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Allow admins to INSERT
DROP POLICY IF EXISTS "Admin can insert guru" ON guru;
CREATE POLICY "Admin can insert guru"
ON guru FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' = 'service_role' OR 
  (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin' OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);
