-- ==========================================
-- CREATE_ADMIN_FORCE.sql
-- ==========================================
-- Bypass Rate Limit & RPC Error.
-- Script ini akan menghapus user 'admin_rescue' (jika ada) dan membuatnya ulang.
-- User ini PASTI valid karena kita inject langsung ke database.

BEGIN;

DO $$ 
DECLARE 
    v_instance_id UUID;
    v_user_id UUID;
    v_email TEXT := 'admin_rescue@sekolah.id';
    v_pass TEXT := '123456';
    v_username TEXT := 'admin_rescue';
    v_encrypted_pw TEXT;
BEGIN
    -- 1. DETEKSI INSTANCE ID (Wajib Benar)
    SELECT id INTO v_instance_id FROM auth.instances LIMIT 1;
    
    IF v_instance_id IS NULL THEN
         -- Fallback ke user lain yg valid
         SELECT instance_id INTO v_instance_id 
         FROM auth.users 
         WHERE instance_id != '00000000-0000-0000-0000-000000000000' 
         LIMIT 1;
    END IF;
    
    -- Safety check
    IF v_instance_id IS NULL THEN
        RAISE EXCEPTION '❌ Gagal deteksi Instance ID. Database kosong?';
    END IF;

    RAISE NOTICE 'Target Instance ID: %', v_instance_id;

    -- 2. BERSIHKAN USER LAMA (Agar tidak Duplicate Error)
    -- Hapus dari user_profiles dulu (referential integrity)
    DELETE FROM public.user_profiles WHERE email = v_email;
    -- Hapus dari auth.users
    DELETE FROM auth.users WHERE email = v_email;

    -- 3. SIAPKAN DATA
    v_user_id := gen_random_uuid();
    v_encrypted_pw := crypt(v_pass, gen_salt('bf')); -- Wajib pgcrypto

    -- 4. INSERT AUTH.USERS
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
        v_user_id,
        'authenticated',
        'authenticated',
        v_email,
        v_encrypted_pw,
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        jsonb_build_object('nama', 'Admin Rescue', 'role', 'admin', 'username', v_username),
        false,
        ''
    );

    -- 5. INSERT IDENTITIES (Penting untuk Supabase Auth)
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
        jsonb_build_object('sub', v_user_id, 'email', v_email, 'instance_id', v_instance_id),
        'email',
        v_user_id::text,
        NULL,
        NOW(),
        NOW()
    );

    -- 6. INSERT PUBLIC.USER_PROFILES
    INSERT INTO public.user_profiles (
        user_id,
        email,
        nama,
        username,
        role,
        roles,
        active_role,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        v_email,
        'Admin Rescue',
        v_username,
        'admin',
        ARRAY['admin'],
        'admin',
        NOW(),
        NOW()
    );

    RAISE NOTICE '✅ USER BERHASIL DIBUAT!';
    RAISE NOTICE '-------------------------------------------';
    RAISE NOTICE 'Username : %', v_username;
    RAISE NOTICE 'Password : %', v_pass;
    RAISE NOTICE '-------------------------------------------';

END $$;

COMMIT;
