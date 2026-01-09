-- Add avatar_url column to user_profiles table
-- Run this script in Supabase SQL Editor

-- Add avatar_url column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN avatar_url TEXT;
        COMMENT ON COLUMN user_profiles.avatar_url IS 'URL foto profil user dari Supabase Storage';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'avatar_url';
