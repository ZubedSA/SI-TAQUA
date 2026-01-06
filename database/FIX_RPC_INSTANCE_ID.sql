-- ==========================================
-- FIX_RPC_INSTANCE_ID.sql
-- ==========================================
-- Masalah: Fungsi admin_create_user menggunakan ID hardcoded '00000000-...'
-- Solusi: Ubah agar mengambil ID dari user yang sedang login (Admin) atau sistem.

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
            RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
        END IF;
    END IF;

    -- B. Validasi Input
    IF new_email IS NULL OR new_email = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Email wajib diisi');
    END IF;
    IF new_password IS NULL OR LENGTH(new_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Password minimal 6 karakter');
    END IF;
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = new_email) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Email sudah terdaftar');
    END IF;

    -- Generate Username
    v_username := COALESCE(new_username, split_part(new_email, '@', 1));
    IF EXISTS (SELECT 1 FROM public.user_profiles WHERE username = v_username) THEN
         RETURN jsonb_build_object('success', false, 'message', 'Username sudah digunakan');
    END IF;

    -- C. Encrypt Password
    v_encrypted_pw := crypt(new_password, gen_salt('bf'));
    
    -- D. DETEKSI INSTANCE_ID YANG BENAR (FIX UTAMA)
    -- 1. Coba ambil dari Admin yang sedang mengeksekusi ini
    SELECT instance_id INTO v_instance_id FROM auth.users WHERE id = auth.uid();
    
    -- 2. Jika null (misal dipanggil via service role), ambil dari auth.instances
    IF v_instance_id IS NULL THEN
        SELECT id INTO v_instance_id FROM auth.instances LIMIT 1;
    END IF;
    
    -- 3. Fallback (Hanya jika benar-benar tidak ketemu)
    IF v_instance_id IS NULL THEN
         v_instance_id := '00000000-0000-0000-0000-000000000000';
    END IF;

    -- E. Insert ke auth.users
    v_new_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        confirmation_token
    ) VALUES (
        v_instance_id,
        v_new_user_id,
        'authenticated',
        'authenticated',
        new_email,
        v_encrypted_pw,
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        jsonb_build_object('nama', new_nama, 'role', new_role, 'username', v_username),
        false,
        ''
    );

    -- F. Insert ke public.user_profiles
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
        new_role,
        new_phone,
        NOW(),
        NOW()
    );

    -- G. Insert identity
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
        v_new_user_id,
        jsonb_build_object('sub', v_new_user_id, 'email', new_email, 'instance_id', v_instance_id), -- Include instance_id here too
        'email',
        v_new_user_id::text,
        NULL,
        NOW(),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'User berhasil dibuat dengan Instance ID yang benar',
        'debug_instance_id', v_instance_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false, 
        'message', 'Database Error: ' || SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_create_user(TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT) TO authenticated;

SELECT '✅ RPC admin_create_user updated with dynamic instance_id.' as status;
