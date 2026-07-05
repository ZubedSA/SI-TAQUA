-- =========================================================================
-- FIX_CHAT_CONTACTS.sql
-- Perbaikan fungsi get_chat_contacts agar menampilkan semua user
-- =========================================================================

-- =====================================================
-- 1. FUNCTION: Get Chat Contacts (SIMPLIFIED)
-- Menampilkan SEMUA user dengan role yang valid
-- =====================================================
CREATE OR REPLACE FUNCTION get_chat_contacts()
RETURNS TABLE (
    user_id UUID,
    nama TEXT,
    email TEXT,
    role TEXT,
    roles TEXT[],
    can_chat BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_my_id UUID := auth.uid();
    v_my_role TEXT;
    v_my_roles TEXT[];
BEGIN
    -- Get current user's role
    SELECT up.role, up.roles INTO v_my_role, v_my_roles
    FROM user_profiles up WHERE up.user_id = v_my_id;
    
    -- Admin, Pengasuh dapat melihat SEMUA user
    IF v_my_role IN ('admin', 'pengasuh') OR 'admin' = ANY(v_my_roles) OR 'pengasuh' = ANY(v_my_roles) THEN
        RETURN QUERY
        SELECT 
            up.user_id,
            up.nama,
            up.email,
            up.role,
            up.roles,
            TRUE as can_chat
        FROM user_profiles up
        WHERE up.user_id != v_my_id
        AND up.role IS NOT NULL
        ORDER BY up.nama;
        RETURN;
    END IF;
    
    -- Bendahara dapat chat dengan Wali Santri + Admin
    IF v_my_role = 'bendahara' OR 'bendahara' = ANY(v_my_roles) THEN
        RETURN QUERY
        SELECT 
            up.user_id,
            up.nama,
            up.email,
            up.role,
            up.roles,
            TRUE as can_chat
        FROM user_profiles up
        WHERE up.user_id != v_my_id
        AND (
            up.role IN ('wali', 'admin', 'pengasuh')
            OR 'wali' = ANY(up.roles)
            OR 'admin' = ANY(up.roles)
        )
        ORDER BY up.nama;
        RETURN;
    END IF;
    
    -- Wali Santri dapat chat dengan Bendahara, Musyrif, Admin
    IF v_my_role = 'wali' OR 'wali' = ANY(v_my_roles) THEN
        RETURN QUERY
        SELECT 
            up.user_id,
            up.nama,
            up.email,
            up.role,
            up.roles,
            TRUE as can_chat
        FROM user_profiles up
        WHERE up.user_id != v_my_id
        AND (
            up.role IN ('bendahara', 'musyrif', 'admin', 'pengasuh', 'guru')
            OR 'bendahara' = ANY(up.roles)
            OR 'musyrif' = ANY(up.roles)
            OR 'admin' = ANY(up.roles)
            OR 'guru' = ANY(up.roles)
        )
        ORDER BY up.nama;
        RETURN;
    END IF;
    
    -- Musyrif/Guru dapat chat dengan Wali Santri + Admin
    IF v_my_role IN ('musyrif', 'guru') OR 'musyrif' = ANY(v_my_roles) OR 'guru' = ANY(v_my_roles) THEN
        RETURN QUERY
        SELECT 
            up.user_id,
            up.nama,
            up.email,
            up.role,
            up.roles,
            TRUE as can_chat
        FROM user_profiles up
        WHERE up.user_id != v_my_id
        AND (
            up.role IN ('wali', 'admin', 'pengasuh')
            OR 'wali' = ANY(up.roles)
            OR 'admin' = ANY(up.roles)
        )
        ORDER BY up.nama;
        RETURN;
    END IF;
    
    -- OTA dapat chat dengan Admin saja
    IF v_my_role = 'ota' OR 'ota' = ANY(v_my_roles) THEN
        RETURN QUERY
        SELECT 
            up.user_id,
            up.nama,
            up.email,
            up.role,
            up.roles,
            TRUE as can_chat
        FROM user_profiles up
        WHERE up.user_id != v_my_id
        AND (
            up.role IN ('admin', 'pengasuh')
            OR 'admin' = ANY(up.roles)
        )
        ORDER BY up.nama;
        RETURN;
    END IF;
    
    -- Default: User lain hanya bisa chat dengan Admin
    RETURN QUERY
    SELECT 
        up.user_id,
        up.nama,
        up.email,
        up.role,
        up.roles,
        TRUE as can_chat
    FROM user_profiles up
    WHERE up.user_id != v_my_id
    AND (
        up.role IN ('admin', 'pengasuh')
        OR 'admin' = ANY(up.roles)
    )
    ORDER BY up.nama;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_chat_contacts() TO authenticated;

-- Notify success
SELECT '✅ Fungsi get_chat_contacts berhasil diperbaiki!' as status;
