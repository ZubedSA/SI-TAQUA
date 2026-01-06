-- =========================================================================
-- FIX_USER_CREATION.sql
-- Memperbaiki pembuatan user baru agar bisa login
-- =========================================================================

-- 1. Pastikan extension pgcrypto aktif
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Buat ulang RPC dengan format password yang benar untuk Supabase Auth
CREATE OR REPLACE FUNCTION admin_create_user_safe(
    p_email TEXT,
    p_password TEXT,
    p_username TEXT,
    p_nama TEXT,
    p_role TEXT,
    p_roles TEXT[],
    p_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_user_id UUID;
    v_instance_id UUID;
    v_encrypted_pw TEXT;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    -- 1. Deteksi Instance ID
    SELECT id INTO v_instance_id FROM auth.instances LIMIT 1;
    IF v_instance_id IS NULL THEN
        v_instance_id := '00000000-0000-0000-0000-000000000000';
    END IF;

    -- 2. Cek duplikat
    IF EXISTS (SELECT 1 FROM public.user_profiles WHERE LOWER(username) = LOWER(p_username)) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Username sudah dipakai');
    END IF;
    IF EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = LOWER(p_email)) THEN
         RETURN jsonb_build_object('success', false, 'message', 'Email sudah terdaftar');
    END IF;

    -- 3. Siapkan Data
    v_user_id := gen_random_uuid();
    
    -- PERBAIKAN: Gunakan format hash yang sama dengan Supabase Auth
    -- Supabase menggunakan bcrypt dengan cost factor 10
    v_encrypted_pw := crypt(p_password, gen_salt('bf', 10));

    -- 4. Insert ke AUTH.USERS
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        phone,
        phone_confirmed_at
    ) VALUES (
        v_instance_id,
        v_user_id,
        'authenticated',
        'authenticated',
        LOWER(p_email),
        v_encrypted_pw,
        v_now, -- email_confirmed_at
        '',
        '',
        '',
        '',
        v_now,
        v_now,
        jsonb_build_object(
            'provider', 'email',
            'providers', ARRAY['email']
        ),
        jsonb_build_object(
            'nama', p_nama,
            'username', p_username,
            'role', p_role,
            'roles', p_roles
        ),
        false,
        p_phone,
        CASE WHEN p_phone IS NOT NULL THEN v_now ELSE NULL END
    );

    -- 5. Insert ke AUTH.IDENTITIES
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
        gen_random_uuid(),
        v_user_id,
        jsonb_build_object(
            'sub', v_user_id::text,
            'email', LOWER(p_email),
            'email_verified', true,
            'provider', 'email'
        ),
        'email',
        v_user_id::text,
        v_now,
        v_now,
        v_now
    );

    -- 6. Return Sukses
    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object('user_id', v_user_id)
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Grant Permission
GRANT EXECUTE ON FUNCTION admin_create_user_safe(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT) TO service_role, authenticated, postgres;

-- Reload
NOTIFY pgrst, 'reload config';

SELECT '✅ RPC diperbaiki. Coba buat user baru dan login.' as status;
