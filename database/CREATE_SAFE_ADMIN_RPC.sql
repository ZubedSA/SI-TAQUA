-- ==========================================
-- CREATE_SAFE_ADMIN_RPC.sql
-- ==========================================
-- RPC Baru: Admin Create User (SAFE VERSION).
-- Fungsi ini hanya membuat Auth User & Identity.
-- Profil akan DIBUAT OTOMATIS oleh Trigger 'handle_new_auth_user' yang sudah dipasang.

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
    -- 1. Deteksi Instance ID (Wajib ada)
    SELECT id INTO v_instance_id FROM auth.instances LIMIT 1;
    -- Fallback jika kosong (kasus development)
    IF v_instance_id IS NULL THEN
        v_instance_id := '00000000-0000-0000-0000-000000000000';
    END IF;

    -- 2. Cek apakah Username/Email sudah ada (Manual check biar error rapi)
    IF EXISTS (SELECT 1 FROM public.user_profiles WHERE LOWER(username) = LOWER(p_username)) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Username sudah dipakai');
    END IF;
    IF EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = LOWER(p_email)) THEN
         RETURN jsonb_build_object('success', false, 'message', 'Email sudah terdaftar');
    END IF;

    -- 3. Siapkan Data
    v_user_id := gen_random_uuid();
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));

    -- 4. Insert ke AUTH.USERS
    -- Metadata kita simpan di raw_user_meta_data agar Trigger bisa membacanya
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
        phone,
        phone_confirmed_at
    ) VALUES (
        v_instance_id,
        v_user_id,
        'authenticated',
        'authenticated',
        p_email,
        v_encrypted_pw,
        v_now, -- Auto confirm email
        v_now,
        v_now,
        '{"provider": "email", "providers": ["email"]}',
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

    -- 5. Insert ke AUTH.IDENTITIES (Penting untuk integritas Supabase)
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
        jsonb_build_object('sub', v_user_id, 'email', p_email),
        'email',
        v_user_id::text,
        NULL,
        v_now,
        v_now
    );

    -- TRIGGER 'on_auth_user_created' AKAN BERJALAN OTOMATIS DISINI
    -- dan mengisi tabel public.user_profiles.

    -- 6. Return Sukses
    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object('user_id', v_user_id)
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Grant Permission agar Admin bisa menjalankannya
GRANT EXECUTE ON FUNCTION admin_create_user_safe(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT) TO service_role, authenticated, postgres;

SELECT '✅ RPC admin_create_user_safe BERHASIL DIBUAT.' as status;
