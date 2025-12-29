-- ==========================================================
-- SCRIPT KHUSUS: PERBAIKAN EMAIL SYNC (VERSI DIAGNOSTIK DEEP)
-- ==========================================================

DROP FUNCTION IF EXISTS admin_update_user_email;

CREATE OR REPLACE FUNCTION admin_update_user_email(
    target_user_id UUID,
    new_email TEXT,
    new_username TEXT,
    new_full_name TEXT,
    new_role TEXT,
    new_roles TEXT[],
    new_active_role TEXT DEFAULT NULL,
    new_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_email TEXT;
    v_check_email TEXT;
    v_rows_auth INT;
    v_rows_profile INT;
    v_msg TEXT;
BEGIN
    -- 1. Cek Permission (Admin OR Self)
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR 'admin' = ANY(roles))
    ) AND (auth.uid() <> target_user_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Admin only (unless updating self)');
    END IF;

    -- 2. Cek Old Email & Existence
    SELECT email INTO v_old_email FROM auth.users WHERE id = target_user_id;
    IF v_old_email IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'User NOT FOUND in Auth (Query returned NULL)');
    END IF;

    -- 2b. Cek No-Op
    IF v_old_email = new_email THEN
         -- Tetap jalankan update META data, tapi catat ini.
         v_msg := 'Email SAMA (Tidak berubah). Update metadata saja.';
    END IF;

    -- 3. UPDATE AUTH.USERS (Force)
    UPDATE auth.users
    SET 
        email = new_email,
        updated_at = NOW(),
        email_confirmed_at = NOW(),
        email_change = '',
        email_change_token_new = NULL,
        email_change_confirm_status = 0,
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
            'nama', new_full_name,
            'role', new_role,
            'username', new_username
        )
    WHERE id = target_user_id;
    
    GET DIAGNOSTICS v_rows_auth = ROW_COUNT;

    -- 4. UPDATE AUTH.IDENTITIES (Force Sync)
    -- Catatan: Column 'email' di auth.identities adalah Generated Column di Supabase baru.
    -- Kita hanya perlu update identity_data, nanti column email akan berubah otomatis.
    UPDATE auth.identities
    SET 
        identity_data = jsonb_set(COALESCE(identity_data, '{}'::jsonb), '{email}', to_jsonb(new_email)),
        updated_at = NOW()
    WHERE user_id = target_user_id; 

    -- 5. UPDATE PROFILES
    UPDATE public.user_profiles
    SET
        email = new_email,
        nama = new_full_name,
        username = new_username,
        role = new_role,
        roles = new_roles,
        active_role = COALESCE(new_active_role, new_role),
        phone = new_phone
    WHERE user_id = target_user_id;
    
    GET DIAGNOSTICS v_rows_profile = ROW_COUNT;

    -- 6. VERIFIKASI LANGSUNG
    SELECT email INTO v_check_email FROM auth.users WHERE id = target_user_id;

    IF v_check_email = new_email OR (v_old_email = new_email) THEN
        RETURN jsonb_build_object(
            'success', true, 
            'message', format(
                'DIAGNOSTIK SUKSES: ID=%s, Old=%s, New=%s, AuthRows=%s, ProfRows=%s, DB_Check=%s', 
                target_user_id, v_old_email, new_email, v_rows_auth, v_rows_profile, v_check_email
            )
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false, 
            'message', format(
                'DIAGNOSTIK GAGAL: ID=%s, Target=%s, Actual_DB=%s. Transaction mungkin berefek sementara tapi tidak persist.',
                target_user_id, new_email, v_check_email
            )
        );
    END IF;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'SYSTEM ERROR: ' || SQLERRM);
END;
$$;

ALTER FUNCTION admin_update_user_email OWNER TO postgres;
GRANT EXECUTE ON FUNCTION admin_update_user_email TO authenticated;
