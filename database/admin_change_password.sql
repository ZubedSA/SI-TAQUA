-- SQL Function: Admin Change User Password
-- Run this in Supabase SQL Editor

-- This function allows admins to change any user's password
-- It uses the Supabase Auth Admin API

CREATE OR REPLACE FUNCTION admin_change_user_password(
    target_user_id UUID,
    new_password TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result TEXT;
BEGIN
    -- Validate password length
    IF LENGTH(new_password) < 8 THEN
        RAISE EXCEPTION 'Password must be at least 8 characters';
    END IF;

    -- Update password via auth.users
    -- Note: This requires the function to run with SECURITY DEFINER
    -- and the executing role to have appropriate permissions
    UPDATE auth.users
    SET 
        encrypted_password = crypt(new_password, gen_salt('bf')),
        updated_at = NOW()
    WHERE id = target_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    result := 'Password changed successfully';
    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users (admins only via RLS or app logic)
GRANT EXECUTE ON FUNCTION admin_change_user_password TO authenticated;

-- Verify function was created
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'admin_change_user_password';
