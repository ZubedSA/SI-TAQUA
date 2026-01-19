-- Fix RLS Policy for Kalender Akademik
-- Problem: "permission denied for table users" 
-- Cause: RLS policies accessed auth.users directly which is not allowed from client
-- Solution: Use user_profiles table instead

-- Drop existing policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Kalender viewable by authenticated" ON kalender_akademik;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Kalender editable by admin" ON kalender_akademik;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Kalender editable by guru/pengurus" ON kalender_akademik;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Kalender specific edit" ON kalender_akademik;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Make sure RLS is enabled
ALTER TABLE kalender_akademik ENABLE ROW LEVEL SECURITY;

-- NEW Policies using user_profiles instead of auth.users

-- Allow all authenticated users to READ events
CREATE POLICY "Kalender viewable by all authenticated users" 
ON kalender_akademik FOR SELECT 
TO authenticated
USING (true);

-- Allow admin to do everything
CREATE POLICY "Kalender full access for admin" 
ON kalender_akademik FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND 'admin' = ANY(user_profiles.roles)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND 'admin' = ANY(user_profiles.roles)
    )
);

-- Allow guru/pengurus to INSERT and UPDATE their own events
CREATE POLICY "Kalender insert for guru/pengurus" 
ON kalender_akademik FOR INSERT 
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND (
            'admin' = ANY(user_profiles.roles) OR
            'guru' = ANY(user_profiles.roles) OR
            'pengurus' = ANY(user_profiles.roles)
        )
    )
);

-- Allow UPDATE by creator or admin
CREATE POLICY "Kalender update by creator or admin" 
ON kalender_akademik FOR UPDATE 
TO authenticated
USING (
    created_by = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND 'admin' = ANY(user_profiles.roles)
    )
)
WITH CHECK (
    created_by = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND 'admin' = ANY(user_profiles.roles)
    )
);

-- Allow DELETE by creator or admin
CREATE POLICY "Kalender delete by creator or admin" 
ON kalender_akademik FOR DELETE 
TO authenticated
USING (
    created_by = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND 'admin' = ANY(user_profiles.roles)
    )
);

-- VERIFY: List policies
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'kalender_akademik';
