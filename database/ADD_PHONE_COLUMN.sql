-- =====================================================
-- MIGRATION: Add 'phone' column to user_profiles
-- Fixes error: Could not find the 'phone' column
-- =====================================================

DO $$
BEGIN
    -- Check if 'phone' column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'phone'
    ) THEN
        -- Add 'phone' column
        ALTER TABLE user_profiles ADD COLUMN phone VARCHAR(20);
        RAISE NOTICE 'Added phone column';
    END IF;

    -- Also ensure 'no_telp' exists as alias/backup if needed
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'no_telp'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN no_telp VARCHAR(20);
    END IF;

END $$;
