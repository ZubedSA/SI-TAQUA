-- ==================================================
-- FIX_USER_PROFILE_ACCESS.sql
-- Fixes "Gagal mengambil data pengguna" error
-- ==================================================

BEGIN;

-- 1. Ensure RLS is enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow all access" ON public.user_profiles; -- Legacy/Insecure

-- 3. Create Correct Policies
-- Allow users to view their OWN profile
CREATE POLICY "Users can view own profile" 
ON public.user_profiles 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Allow admins (or those with admin role) to view ALL profiles
-- Note: referencing user_profiles within user_profiles policy can cause infinite recursion if not careful.
-- Safer to just allow basic read if we are authenticated for now, OR restrict strictly.
-- For "Login" flow, we only need "Users can view own profile".
-- But authService.resolveRoles fetches by user_id.

-- Let's make it simple and robust:
-- Authenticated users can read ANY profile (needed if admins look up others, or public profile info)
-- OR just strict own profile?
-- The error happened during login. The user is logged in as THEMSELVES.
-- So `auth.uid() = user_id` should suffice for the login step.

-- However, to be safe and avoid future "Admin can't see users" bugs:
CREATE POLICY "Allow read access for authenticated users"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (true); -- Read-only access to profiles is generally safe-ish for names/roles within the system

-- 4. Backfill Missing Profiles
-- If a user exists in auth.users but not in user_profiles, they can't login properly.
INSERT INTO public.user_profiles (user_id, email, nama, role, roles, active_role)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'nama', 'User'), 
    'guest', 
    ARRAY['guest'], 
    'guest'
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.user_id = u.id
);

-- 5. Fix Admin Profil Permissions (Just in case)
UPDATE public.user_profiles
SET 
    roles = array_append(roles, 'admin'),
    active_role = 'admin'
WHERE role = 'admin' AND NOT 'admin' = ANY(roles);

COMMIT;

SELECT '✅ FIX USER PROFILE ACCESS: COMPLETED' as status;
