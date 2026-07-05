-- =====================================================
-- FIX_MULTI_ROLE_SYSTEM.sql
-- =====================================================
-- Problem: Ketika role baru ditambahkan, data role tidak auto-create
-- Solution: Trigger + Fix Function untuk auto-initialize
-- =====================================================

-- =====================================================
-- STEP 0: Ensure tables have user_id column
-- =====================================================

-- Add user_id to guru table if not exists
ALTER TABLE guru ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_guru_user_id ON guru(user_id) WHERE user_id IS NOT NULL;

-- orang_tua_asuh already has user_id (from migration_ota.sql)

-- =====================================================
-- STEP 1: Function untuk Initialize Data Role
-- =====================================================

CREATE OR REPLACE FUNCTION initialize_role_data()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_nama TEXT;
    v_email TEXT;
    v_new_role TEXT;
    v_new_roles TEXT[];
BEGIN
    v_user_id := NEW.user_id;
    v_nama := COALESCE(NEW.nama, 'User');
    v_email := NEW.email;
    v_new_role := NEW.role;
    v_new_roles := COALESCE(NEW.roles, ARRAY[]::TEXT[]);

    -- ========================================
    -- CHECK FOR OTA ROLE
    -- ========================================
    IF v_new_role = 'ota' OR 'ota' = ANY(v_new_roles) THEN
        -- Cek apakah sudah ada record di orang_tua_asuh
        IF NOT EXISTS (SELECT 1 FROM orang_tua_asuh WHERE user_id = v_user_id) THEN
            -- Create new OTA profile
            INSERT INTO orang_tua_asuh (user_id, nama, email, status)
            VALUES (v_user_id, v_nama, v_email, TRUE);
            
            RAISE NOTICE 'Auto-created OTA profile for user: %', v_user_id;
        END IF;
    END IF;

    -- ========================================
    -- CHECK FOR GURU ROLE
    -- ========================================
    IF v_new_role = 'guru' OR 'guru' = ANY(v_new_roles) THEN
        -- Cek apakah sudah ada record di guru (by user_id)
        IF NOT EXISTS (SELECT 1 FROM guru WHERE user_id = v_user_id) THEN
            -- Try to find existing guru by name and link
            UPDATE guru SET user_id = v_user_id
            WHERE LOWER(nama) = LOWER(v_nama) AND user_id IS NULL
            AND id = (SELECT MIN(id) FROM guru WHERE LOWER(nama) = LOWER(v_nama) AND user_id IS NULL);
            
            -- If no match found by name, create new
            IF NOT FOUND THEN
                INSERT INTO guru (nama, user_id, nip, jenis_kelamin, status)
                VALUES (
                    v_nama, 
                    v_user_id, 
                    'AUTO-' || SUBSTRING(v_user_id::TEXT, 1, 8), 
                    'Laki-laki', 
                    'Aktif'
                );
            END IF;
            
            RAISE NOTICE 'Auto-created/linked Guru profile for user: %', v_user_id;
        END IF;
    END IF;

    -- ========================================
    -- ADD MORE ROLES HERE AS NEEDED
    -- ========================================
    -- Template:
    -- IF v_new_role = 'role_name' OR 'role_name' = ANY(v_new_roles) THEN
    --     IF NOT EXISTS (SELECT 1 FROM table_name WHERE user_id = v_user_id) THEN
    --         INSERT INTO table_name (...)
    --     END IF;
    -- END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 2: Create Trigger on user_profiles
-- =====================================================

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_initialize_role_data ON user_profiles;

-- Create trigger for INSERT and UPDATE
CREATE TRIGGER trg_initialize_role_data
    AFTER INSERT OR UPDATE OF role, roles, active_role 
    ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION initialize_role_data();

-- =====================================================
-- STEP 3: RPC Function untuk Fix Existing Data
-- =====================================================

CREATE OR REPLACE FUNCTION fix_missing_role_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ota_fixed INT := 0;
    v_guru_fixed INT := 0;
    v_record RECORD;
BEGIN
    -- ========================================
    -- FIX OTA ROLE - Missing orang_tua_asuh
    -- ========================================
    FOR v_record IN 
        SELECT up.user_id, up.nama, up.email
        FROM user_profiles up
        WHERE (up.role = 'ota' OR 'ota' = ANY(up.roles))
        AND NOT EXISTS (
            SELECT 1 FROM orang_tua_asuh ota 
            WHERE ota.user_id = up.user_id
        )
    LOOP
        INSERT INTO orang_tua_asuh (user_id, nama, email, status)
        VALUES (v_record.user_id, COALESCE(v_record.nama, 'User'), v_record.email, TRUE)
        ON CONFLICT (user_id) DO NOTHING;
        
        v_ota_fixed := v_ota_fixed + 1;
    END LOOP;

    -- ========================================
    -- FIX GURU ROLE - Missing guru record
    -- ========================================
    FOR v_record IN 
        SELECT up.user_id, up.nama
        FROM user_profiles up
        WHERE (up.role = 'guru' OR 'guru' = ANY(up.roles))
        AND NOT EXISTS (
            SELECT 1 FROM guru g 
            WHERE g.user_id = up.user_id
        )
    LOOP
        -- Try to link existing guru by name first
        UPDATE guru SET user_id = v_record.user_id
        WHERE LOWER(nama) = LOWER(COALESCE(v_record.nama, 'Guru')) 
        AND user_id IS NULL
        AND id = (SELECT MIN(id) FROM guru WHERE LOWER(nama) = LOWER(COALESCE(v_record.nama, 'Guru')) AND user_id IS NULL);
        
        -- If no match found, create new guru with required fields
        IF NOT FOUND THEN
            INSERT INTO guru (nama, user_id, nip, jenis_kelamin, status)
            VALUES (
                COALESCE(v_record.nama, 'Guru'), 
                v_record.user_id,
                'AUTO-' || SUBSTRING(v_record.user_id::TEXT, 1, 8),
                'Laki-laki',
                'Aktif'
            )
            ON CONFLICT DO NOTHING;
        END IF;
        
        v_guru_fixed := v_guru_fixed + 1;
    END LOOP;

    -- ========================================
    -- RETURN RESULT
    -- ========================================
    RETURN jsonb_build_object(
        'success', TRUE,
        'ota_fixed', v_ota_fixed,
        'guru_fixed', v_guru_fixed,
        'message', format('Fixed: %s OTA, %s Guru profiles', v_ota_fixed, v_guru_fixed)
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', FALSE,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION fix_missing_role_data() TO authenticated;

-- =====================================================
-- STEP 4: RPC Function - Add Role to User (Safe)
-- =====================================================

CREATE OR REPLACE FUNCTION add_role_to_user(
    p_user_id UUID,
    p_new_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_role TEXT;
    v_current_roles TEXT[];
BEGIN
    -- Check if caller is admin
    SELECT role INTO v_caller_role
    FROM user_profiles
    WHERE user_id = auth.uid();
    
    IF v_caller_role != 'admin' THEN
        IF NOT EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid() AND 'admin' = ANY(roles)
        ) THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'message', 'Unauthorized: Only admin can add roles'
            );
        END IF;
    END IF;

    -- Get current roles
    SELECT COALESCE(roles, ARRAY[]::TEXT[]) INTO v_current_roles
    FROM user_profiles
    WHERE user_id = p_user_id;
    
    IF v_current_roles IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'User not found'
        );
    END IF;

    -- Check if role already exists
    IF p_new_role = ANY(v_current_roles) THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', format('User already has role: %s', p_new_role)
        );
    END IF;

    -- Add role to array
    UPDATE user_profiles
    SET 
        roles = array_append(v_current_roles, p_new_role),
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Trigger will auto-create role data

    RETURN jsonb_build_object(
        'success', TRUE,
        'message', format('Role %s added successfully. Data auto-initialized.', p_new_role),
        'new_roles', array_append(v_current_roles, p_new_role)
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', FALSE,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION add_role_to_user(UUID, TEXT) TO authenticated;

-- =====================================================
-- STEP 5: RPC Function - Remove Role from User
-- =====================================================

CREATE OR REPLACE FUNCTION remove_role_from_user(
    p_user_id UUID,
    p_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_role TEXT;
    v_current_roles TEXT[];
BEGIN
    -- Check if caller is admin
    SELECT role INTO v_caller_role
    FROM user_profiles
    WHERE user_id = auth.uid();
    
    IF v_caller_role != 'admin' THEN
        IF NOT EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid() AND 'admin' = ANY(roles)
        ) THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'message', 'Unauthorized: Only admin can remove roles'
            );
        END IF;
    END IF;

    -- Remove role from array (keep data, just remove access)
    UPDATE user_profiles
    SET 
        roles = array_remove(roles, p_role),
        -- If active_role was the removed role, clear it
        active_role = CASE WHEN active_role = p_role THEN NULL ELSE active_role END,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- NOTE: We do NOT delete the role data (orang_tua_asuh, guru, etc.)
    -- This preserves historical data

    RETURN jsonb_build_object(
        'success', TRUE,
        'message', format('Role %s removed. Data preserved.', p_role)
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', FALSE,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION remove_role_from_user(UUID, TEXT) TO authenticated;

-- =====================================================
-- STEP 6: RPC Function - Get User Roles with Data Status
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_roles_status(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB;
    v_profile RECORD;
BEGIN
    SELECT 
        role,
        roles,
        active_role,
        nama,
        email
    INTO v_profile
    FROM user_profiles
    WHERE user_id = p_user_id;

    IF v_profile IS NULL THEN
        RETURN jsonb_build_object('error', 'User not found');
    END IF;

    v_result := jsonb_build_object(
        'user_id', p_user_id,
        'primary_role', v_profile.role,
        'all_roles', v_profile.roles,
        'active_role', v_profile.active_role,
        'nama', v_profile.nama,
        'email', v_profile.email,
        'role_data_status', jsonb_build_object(
            'ota', CASE 
                WHEN v_profile.role = 'ota' OR 'ota' = ANY(COALESCE(v_profile.roles, ARRAY[]::TEXT[])) THEN
                    CASE WHEN EXISTS (SELECT 1 FROM orang_tua_asuh WHERE user_id = p_user_id)
                        THEN 'connected'
                        ELSE 'missing'
                    END
                ELSE 'not_applicable'
            END,
            'guru', CASE 
                WHEN v_profile.role = 'guru' OR 'guru' = ANY(COALESCE(v_profile.roles, ARRAY[]::TEXT[])) THEN
                    CASE WHEN EXISTS (SELECT 1 FROM guru WHERE user_id = p_user_id)
                        THEN 'connected'
                        ELSE 'missing'
                    END
                ELSE 'not_applicable'
            END
        )
    );

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_roles_status(UUID) TO authenticated;

-- =====================================================
-- STEP 7: Run Fix for Existing Data
-- =====================================================

-- Uncomment to run immediately:
-- SELECT fix_missing_role_data();

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT '========================================' as separator;
SELECT '✅ MULTI-ROLE SYSTEM FIX COMPLETED!' as status;
SELECT '========================================' as separator;

-- Show created functions
SELECT 
    routine_name as function_name,
    '✅' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'initialize_role_data',
    'fix_missing_role_data',
    'add_role_to_user',
    'remove_role_from_user',
    'get_user_roles_status'
)
ORDER BY routine_name;

-- Show trigger
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    '✅' as status
FROM information_schema.triggers
WHERE trigger_name = 'trg_initialize_role_data';

SELECT '========================================' as separator;
SELECT 'Next: Run SELECT fix_missing_role_data() to fix existing users' as next_step;
