-- =====================================================
-- FIX RLS ROLE DETECTION
-- Deskripsi: Memperbaiki fungsi get_current_user_role agar menghormati 'active_role'
-- Masalah: Pengasuh tidak melihat data karena RLS membaca role utama (misal: Wali/Admin) bukannya active_role.
-- =====================================================

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
    v_active_role TEXT;
BEGIN
    SELECT role, active_role 
    INTO v_role, v_active_role
    FROM user_profiles
    WHERE user_id = auth.uid();
    
    -- PRIORITASKAN ACTIVE_ROLE
    -- Jika user sedang switch role (misal jadi Pengasuh), gunakan itu.
    -- Jika tidak ada active_role, gunakan role utama.
    RETURN COALESCE(v_active_role, v_role, 'guest');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refresh Permissions
GRANT EXECUTE ON FUNCTION get_current_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_role TO anon;

-- Verifikasi (Optional check)
DO $$
BEGIN
    RAISE NOTICE 'Fungsi get_current_user_role berhasil diperbarui untuk mendukung active_role.';
END $$;
