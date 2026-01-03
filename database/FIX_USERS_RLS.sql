-- FIX PERMISSION DENIED FOR TABLE USERS
-- Logic: The RLS policies on 'santri' and other tables check if the user is an admin by querying the 'users' table.
-- If the current user cannot read their own row in 'users', this check fails with "permission denied".

-- 1. Grant generic SELECT permission to authenticated users
GRANT SELECT ON TABLE "users" TO "authenticated";

-- 2. Ensure RLS is enabled on users table
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policy: Users can read their own data
-- This allows the "EXISTS (SELECT 1 FROM users ...)" check in other policies to succeed.
DROP POLICY IF EXISTS "Users can read own data" ON "users";

CREATE POLICY "Users can read own data"
ON "users" FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

-- 4. Create RLS Policy: Admins can read all users
-- Useful for User Management pages
DROP POLICY IF EXISTS "Admins can read all users" ON "users";

CREATE POLICY "Admins can read all users"
ON "users" FOR SELECT
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
