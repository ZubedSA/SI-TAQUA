-- =====================================================
-- MIGRATION: Multi-Role Support for Dashboard Architecture
-- Run this AFTER backing up your database!
-- =====================================================

-- Step 1: Check if roles column already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'roles'
    ) THEN
        -- Add roles array column with default
        ALTER TABLE user_profiles ADD COLUMN roles TEXT[] DEFAULT ARRAY['admin']::TEXT[];
        RAISE NOTICE 'Added roles column';
    END IF;
END $$;

-- Step 2: Check if active_role column already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'active_role'
    ) THEN
        -- Add active_role column for role switcher
        ALTER TABLE user_profiles ADD COLUMN active_role TEXT DEFAULT 'admin';
        RAISE NOTICE 'Added active_role column';
    END IF;
END $$;

-- Step 3: Migrate existing role data to roles array
UPDATE user_profiles 
SET roles = ARRAY[role]::TEXT[]
WHERE role IS NOT NULL 
  AND (roles IS NULL OR roles = ARRAY['admin']::TEXT[]);

-- Step 4: Set active_role from existing role
UPDATE user_profiles 
SET active_role = role
WHERE role IS NOT NULL 
  AND active_role IS NULL;

-- Step 5: Handle 'pengasuh' role - map to 'bendahara' (keuangan access)
UPDATE user_profiles
SET roles = array_append(roles, 'bendahara')
WHERE role = 'pengasuh' 
  AND NOT ('bendahara' = ANY(roles));

-- Step 6: Create index for performance
DROP INDEX IF EXISTS idx_user_profiles_active_role;
CREATE INDEX idx_user_profiles_active_role ON user_profiles(active_role);

-- Step 7: Verify migration
SELECT 
    email,
    username,
    role as old_role,
    roles,
    active_role
FROM user_profiles
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- HELPER FUNCTION: Switch user's active role
-- =====================================================
CREATE OR REPLACE FUNCTION switch_user_role(
    p_user_id UUID,
    p_new_role TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_roles TEXT[];
    v_result JSON;
BEGIN
    -- Get user's available roles
    SELECT roles INTO v_user_roles
    FROM user_profiles
    WHERE user_id = p_user_id;
    
    -- Validate role exists in user's roles
    IF NOT (p_new_role = ANY(v_user_roles)) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User does not have this role'
        );
    END IF;
    
    -- Update active role
    UPDATE user_profiles
    SET active_role = p_new_role
    WHERE user_id = p_user_id;
    
    RETURN json_build_object(
        'success', true,
        'activeRole', p_new_role
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION switch_user_role(UUID, TEXT) TO authenticated;

-- =====================================================
-- HELPER FUNCTION: Get user's available roles
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_roles(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_roles TEXT[];
    v_active_role TEXT;
BEGIN
    SELECT roles, active_role 
    INTO v_roles, v_active_role
    FROM user_profiles
    WHERE user_id = p_user_id;
    
    RETURN json_build_object(
        'roles', v_roles,
        'activeRole', v_active_role
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_roles(UUID) TO authenticated;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE 'New columns: roles (TEXT[]), active_role (TEXT)';
    RAISE NOTICE 'New functions: switch_user_role(), get_user_roles()';
END $$;
