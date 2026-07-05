-- =====================================================
-- FIX EXTENSION PGCRYPTO & SEARCH PATH
-- =====================================================

-- 1. Force Enable Extension di Schema Public
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- 2. Pastikan permission execute
GRANT EXECUTE ON FUNCTION public.gen_salt(text) TO public;
GRANT EXECUTE ON FUNCTION public.crypt(text, text) TO public;
GRANT EXECUTE ON FUNCTION public.digest(text, text) TO public;

-- 3. Update Function RPC agar Explicit Schema
-- Kita tambahkan 'public.' di depan fungsi extension untuk menghindari masalah search_path
CREATE OR REPLACE FUNCTION admin_reset_password(
    target_user_id UUID,
    new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions -- Force search path
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
    -- Menggunakan public.crypt dan public.gen_salt secara eksplisit
    UPDATE auth.users
    SET 
        encrypted_password = public.crypt(new_password, public.gen_salt('bf')),
        updated_at = NOW()
    WHERE id = target_user_id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;

    -- C. Sync ke User Profile
    UPDATE public.user_profiles
    SET updated_at = NOW()
    WHERE user_id = target_user_id;

    IF v_rows > 0 THEN
        RETURN jsonb_build_object('success', true, 'message', 'Password updated successfully');
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'User not found in Auth table');
    END IF;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Database Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_reset_password TO authenticated;
