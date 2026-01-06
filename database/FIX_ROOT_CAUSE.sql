-- ==========================================
-- FIX_ROOT_CAUSE.sql
-- ==========================================
-- SCRIPT PENYELAMAT.
-- Masalah: auth.instances KOSONG, sehingga semua user dianggap invalid.
-- Solusi: Inject '00000000-...' ke auth.instances, lalu buat user yg sesuai.

BEGIN;

-- 1. FIX INSTANCE ID (Inject jika kosong)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.instances) THEN
        RAISE NOTICE '⚠️ auth.instances kosong! Melakukan Injection...';
        -- Coba insert ID default (biasanya dipakai lokal/docker)
        INSERT INTO auth.instances (id, uuid) 
        VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000');
    ELSE
        RAISE NOTICE '✅ auth.instances sudah ada isinya.';
    END IF;
END $$;

-- 2. FORCE CREATE USER 'admin_rescue'
DO $$ 
DECLARE 
    v_user_id UUID;
    v_email TEXT := 'admin_rescue@sekolah.id';
    v_pass TEXT := '123456';
    v_instance_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
    -- Hapus user lama biar bersih
    DELETE FROM public.user_profiles WHERE email = v_email;
    DELETE FROM auth.users WHERE email = v_email;

    v_user_id := gen_random_uuid();

    -- Insert User
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
        is_super_admin
    ) VALUES (
        v_instance_id,
        v_user_id,
        'authenticated',
        'authenticated',
        v_email,
        crypt(v_pass, gen_salt('bf')), -- Wajib pgcrypto
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        jsonb_build_object('nama', 'Admin Rescue', 'role', 'admin', 'username', 'admin_rescue'),
        false
    );

    -- Insert Identity
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

    -- Insert Profile
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
        'admin_rescue',
        'admin',
        ARRAY['admin'],
        'admin',
        NOW(),
        NOW()
    );

    RAISE NOTICE '✅ USER BERHASIL DIBUAT dengan Instance ID 0000...';
END $$;

-- 3. PASTIKAN PGCRYPTO AMAN (Sekali lagi)
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO public;
GRANT USAGE ON SCHEMA public TO anon, authenticated, postgres, service_role;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO postgres, service_role;

COMMIT;

SELECT '✅ DONE. Login: admin_rescue / 123456' as status;
