-- ============================================================================
-- FIX: MIN(UUID) ERROR IN TRIGGER
-- ============================================================================
-- Problem: PostgreSQL tidak support MIN() untuk UUID
-- Solution: Gunakan ORDER BY + LIMIT 1 sebagai gantinya
-- ============================================================================
-- JALANKAN DI SUPABASE SQL EDITOR
-- ============================================================================

-- Drop dan recreate trigger function dengan fix
CREATE OR REPLACE FUNCTION initialize_role_data()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_nama TEXT;
    v_email TEXT;
    v_new_role TEXT;
    v_new_roles TEXT[];
    v_first_guru_id UUID;
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
        IF NOT EXISTS (SELECT 1 FROM orang_tua_asuh WHERE user_id = v_user_id) THEN
            INSERT INTO orang_tua_asuh (user_id, nama, email, status)
            VALUES (v_user_id, v_nama, v_email, TRUE);
            
            RAISE NOTICE 'Auto-created OTA profile for user: %', v_user_id;
        END IF;
    END IF;

    -- ========================================
    -- CHECK FOR GURU ROLE (FIXED - no MIN(uuid))
    -- ========================================
    IF v_new_role = 'guru' OR 'guru' = ANY(v_new_roles) THEN
        IF NOT EXISTS (SELECT 1 FROM guru WHERE user_id = v_user_id) THEN
            -- Get first unlinked guru by name (use ORDER BY + LIMIT instead of MIN)
            SELECT id INTO v_first_guru_id
            FROM guru 
            WHERE LOWER(nama) = LOWER(v_nama) AND user_id IS NULL
            ORDER BY created_at ASC, id ASC
            LIMIT 1;
            
            IF v_first_guru_id IS NOT NULL THEN
                -- Link existing guru
                UPDATE guru SET user_id = v_user_id
                WHERE id = v_first_guru_id;
            ELSE
                -- Create new guru
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
    -- MUSYRIF ROLE - No special table needed
    -- (Data stored in musyrif_halaqoh table separately)
    -- ========================================

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Trigger function initialize_role_data() sudah diperbaiki' as status;

-- Also fix the fix_missing_role_data function
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
    v_first_guru_id UUID;
BEGIN
    -- FIX OTA ROLE
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

    -- FIX GURU ROLE (FIXED - no MIN(uuid))
    FOR v_record IN 
        SELECT up.user_id, up.nama
        FROM user_profiles up
        WHERE (up.role = 'guru' OR 'guru' = ANY(up.roles))
        AND NOT EXISTS (
            SELECT 1 FROM guru g 
            WHERE g.user_id = up.user_id
        )
    LOOP
        -- Get first unlinked guru by name
        SELECT id INTO v_first_guru_id
        FROM guru 
        WHERE LOWER(nama) = LOWER(COALESCE(v_record.nama, 'Guru')) AND user_id IS NULL
        ORDER BY created_at ASC, id ASC
        LIMIT 1;
        
        IF v_first_guru_id IS NOT NULL THEN
            UPDATE guru SET user_id = v_record.user_id
            WHERE id = v_first_guru_id;
        ELSE
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

SELECT '✅ Function fix_missing_role_data() sudah diperbaiki' as status;
SELECT '========================================' as separator;
SELECT '✅ FIX SELESAI! Silakan coba simpan user lagi.' as status;
