-- FIX OWNERSHIP AND RLS FOR USERS TABLE
-- This script aims to fix the "must be owner of table users" error by explicitly setting the owner to 'postgres'.
-- Run this in the Supabase Dashboard > SQL Editor.

-- 1. Attempt to set owner to postgres (Standard superuser role in Supabase)
-- If this fails, you may be running as a role that has no permissions at all (very rare in Dashboard).
ALTER TABLE "users" OWNER TO "postgres";

-- 2. Grant Permissions
GRANT ALL ON TABLE "users" TO "postgres";
GRANT ALL ON TABLE "users" TO "service_role";
GRANT SELECT ON TABLE "users" TO "authenticated";

-- 3. Enable RLS
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies
-- Users can read their own data
DROP POLICY IF EXISTS "Users can read own data" ON "users";
CREATE POLICY "Users can read own data"
ON "users" FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

-- Admins can read all users
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
