-- ============================================================================
-- CREATE_ADMIN_CREATE_USER_RPC.sql
-- ============================================================================
-- Tujuan: Membuat user baru via RPC untuk menghindari Rate Limit pada client-side signUp
-- Security: Hanya bisa dijalankan oleh Admin
-- ============================================================================

-- 1. Pastikan Extension Pgcrypto aktif (untuk hashing password)
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
-- Fallback jika schema extensions tidak ada/tidak bisa diakses
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;
EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignore if already exists in another schema implies accessible via search_path usually
END$$;

-- 2. Buat Function RPC
DROP FUNCTION IF EXISTS admin_create_user(TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT);

CREATE OR REPLACE FUNCTION admin_create_user(
    new_email TEXT,
    new_password TEXT,
    new_nama TEXT,
    new_role TEXT,
    new_roles TEXT[],
    new_phone TEXT DEFAULT NULL,
    new_username TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
-- Set search_path agar bisa akses auth table dan pgcrypto functions
SET search_path = extensions, public, auth
AS $$
DECLARE
    v_caller_role TEXT;
    v_new_user_id UUID;
    v_encrypted_pw TEXT;
    v_instance_id UUID;
    v_username TEXT;
BEGIN
    -- A. Cek Permission (Hanya Admin)
    SELECT COALESCE(role, '') INTO v_caller_role
    FROM public.user_profiles
    WHERE user_id = auth.uid();

    IF v_caller_role != 'admin' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() 
            AND 'admin' = ANY(roles)
        ) THEN
            RETURN jsonb_build_object(
                'success', false, 
                'message', 'Unauthorized: Hanya admin yang bisa membuat user via RPC'
            );
        END IF;
    END IF;

    -- B. Validasi Input Dasar
    IF new_email IS NULL OR new_email = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Email wajib diisi');
    END IF;
    
    IF new_password IS NULL OR LENGTH(new_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Password minimal 6 karakter');
    END IF;

    -- Check if email already exists
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = new_email) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Email sudah terdaftar');
    END IF;

    -- Generate username if not provided
    IF new_username IS NULL OR new_username = '' THEN
        v_username := split_part(new_email, '@', 1);
    ELSE
        v_username := new_username;
    END IF;

    -- Check if username exists in profiles
    IF EXISTS (SELECT 1 FROM public.user_profiles WHERE username = v_username) THEN
         RETURN jsonb_build_object('success', false, 'message', 'Username sudah digunakan');
    END IF;

    -- C. Generate Password Hash
    -- Menggunakan gen_salt('bf') dari pgcrypto (Blowfish/Bcrypt)
    v_encrypted_pw := crypt(new_password, gen_salt('bf'));
    
    -- D. Ambil instance_id (untuk Supabase self-hosted/local, biasanya '00000000-0000-0000-0000-000000000000')
    -- Tapi kita coba ambil dari user yang ada atau default NULL (Supabase cloud handle ini otomatis biasanya jika null, tapi kita insert manual)
    -- Kita pakai gen_random_uuid() untuk user id baru
    v_new_user_id := gen_random_uuid();

    -- E. Insert ke auth.users
    -- Kolom minimal yang diperlukan agar user bisa login
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', -- Default instance_id
        v_new_user_id,
        'authenticated',
        'authenticated',
        new_email,
        v_encrypted_pw,
        NOW(), -- Auto confirm email
        NULL,
        NULL,
        '{"provider": "email", "providers": ["email"]}',
        jsonb_build_object('nama', new_nama, 'role', new_role, 'username', v_username),
        NOW(),
        NOW(),
        '',
        '',
        ''
    );

    -- F. Insert ke public.user_profiles (Sync manual karena trigger dihapus)
    INSERT INTO public.user_profiles (
        user_id,
        email,
        nama,
        username,
        role,
        roles,
        active_role,
        phone,
        created_at,
        updated_at
    ) VALUES (
        v_new_user_id,
        new_email,
        new_nama,
        v_username,
        new_role,
        new_roles,
        new_role, -- Default active role = primary role
        new_phone,
        NOW(),
        NOW()
    );

    -- G. Insert identity (optional tapi bagus untuk konsistensi auth)
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(), -- ID identity unk
        v_new_user_id,
        jsonb_build_object('sub', v_new_user_id, 'email', new_email),
        'email',
        v_new_user_id::text, -- Gunakan user_id sebagai provider_id untuk email provider
        NULL,
        NOW(),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'User berhasil dibuat',
        'data', jsonb_build_object(
            'user_id', v_new_user_id,
            'email', new_email,
            'role', new_role
        )
    );

EXCEPTION WHEN OTHERS THEN
    -- Rollback otomatis terjadi di Postgres function jika error
    RETURN jsonb_build_object(
        'success', false, 
        'message', 'Database Error: ' || SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_create_user(TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT) TO authenticated;

SELECT '✅ RPC admin_create_user berhasil dibuat.' as status;
