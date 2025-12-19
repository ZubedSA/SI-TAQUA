-- 1. Add username column if not exists
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS username TEXT;

-- 2. Populate username from email (part before @) for existing users
-- Only update if username is null
UPDATE public.user_profiles
SET username = split_part(email, '@', 1)
WHERE username IS NULL AND email IS NOT NULL;

-- 3. Ensure uniqueness (Manual check recommended, but this constraint is needed)
-- If this fails, you have duplicate usernames. Run this query to find them:
-- SELECT username, count(*) FROM user_profiles GROUP BY username HAVING count(*) > 1;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_username_key'
    ) THEN
        ALTER TABLE public.user_profiles
        ADD CONSTRAINT user_profiles_username_key UNIQUE (username);
    END IF;
END $$;

-- 4. Create RPC function for secure lookup (Security Definer to bypass RLS)
CREATE OR REPLACE FUNCTION get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email TEXT;
BEGIN
    -- Case insensitive match
    SELECT email INTO v_email
    FROM user_profiles
    WHERE LOWER(username) = LOWER(p_username)
    LIMIT 1;
    
    RETURN v_email; -- Returns NULL if not found
END;
$$;

-- 5. Grant execute permission
GRANT EXECUTE ON FUNCTION get_email_by_username(TEXT) TO anon, authenticated, service_role;
