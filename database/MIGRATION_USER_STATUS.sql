-- ====================================================================
-- MIGRATION: ADD USER ACTIVE STATUS FEATURE
-- ====================================================================

-- 1. Ensure `is_active` column exists on `user_profiles`
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update any existing nulls just in case
UPDATE public.user_profiles SET is_active = true WHERE is_active IS NULL;

-- 2. Create RPC for Admin to toggle user status
CREATE OR REPLACE FUNCTION admin_toggle_user_status(
    target_user_id UUID,
    new_status BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rows_affected INT;
    v_nama TEXT;
BEGIN
    -- 1. Check Permissions (Admin Only)
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR 'admin' = ANY(roles))
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Admin only');
    END IF;

    -- 2. Prevent deactivating self
    IF target_user_id = auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Tidak dapat menonaktifkan akun sendiri');
    END IF;

    -- 3. Update the user_profiles table
    UPDATE public.user_profiles
    SET is_active = new_status
    WHERE user_id = target_user_id
    RETURNING nama INTO v_nama;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    IF v_rows_affected = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'User tidak ditemukan di profil');
    END IF;

    -- 4. Return success
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Status akun ' || v_nama || ' berhasil diubah menjadi ' || (CASE WHEN new_status THEN 'Aktif' ELSE 'Nonaktif' END)
    );
END;
$$;

-- 3. Grant execute permission
GRANT EXECUTE ON FUNCTION admin_toggle_user_status TO authenticated;

SELECT '✅ Migration MIGRATION_USER_STATUS berhasil!' as status;
