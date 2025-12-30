-- =====================================================
-- ADMIN RESET PASSWORD RPC (SECURE)
-- =====================================================
-- Memungkinkan Admin mereset password user lain tanpa Service Role Key di Frontend.
-- Syarat: Extension 'pgcrypto' harus aktif (Default Supabase biasanya aktif).

-- 1. Enable pgcrypto (Idempotent)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create RPC Function
CREATE OR REPLACE FUNCTION admin_reset_password(
    target_user_id UUID,
    new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Jalan dengan hak akses Postgres (Bypass RLS auth.users)
AS $$
DECLARE
    v_rows INT;
BEGIN
    -- A. Cek Permission (Admin ATAU Diri Sendiri)
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR 'admin' = ANY(roles) OR user_id = target_user_id)
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Admin access or Self-update required');
    END IF;

    -- B. Update Password di auth.users
    -- Supabase menggunakan BCRYPT. Kita gunakan pgcrypto 'crypt' dengan salt gen_salt('bf').
    UPDATE auth.users
    SET 
        encrypted_password = crypt(new_password, gen_salt('bf')),
        updated_at = NOW()
    WHERE id = target_user_id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;

    -- C. Sync ke User Profile (Optional, jika kita simpan referensi/log)
    -- Kita update updated_at saja di profile
    UPDATE public.user_profiles
    SET updated_at = NOW()
    WHERE user_id = target_user_id;

    IF v_rows > 0 THEN
        RETURN jsonb_build_object('success', true, 'message', 'Password updated successfully');
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Database Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_reset_password TO authenticated;
