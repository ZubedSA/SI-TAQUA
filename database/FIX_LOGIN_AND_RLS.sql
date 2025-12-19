-- =====================================================
-- FIX LOGIN & RLS INFINITE LOOP
-- =====================================================
-- 1. Membuat Helper Function aman untuk Lookup Email via No HP (Bypass RLS)
-- 2. Memperbaiki Policy user_profiles agar tidak Infinite Loop
-- =====================================================

-- 1. FUNCTION LOOKUP EMAIL (Untuk Login No HP)
-- Dijalankan sebagai Security Definer (Superuser) untuk bypass RLS
CREATE OR REPLACE FUNCTION get_email_by_phone(p_phone TEXT)
RETURNS TEXT AS $$
DECLARE
    found_email TEXT;
    normalized_phone TEXT;
BEGIN
    -- Normalisasi input (hapus karakter non-digit)
    normalized_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
    
    -- Handle format 08 -> 628
    IF LEFT(normalized_phone, 1) = '0' THEN
        normalized_phone := '62' || SUBSTRING(normalized_phone, 2);
    END IF;
    
    -- Cari email
    SELECT email INTO found_email
    FROM user_profiles
    WHERE 
        regexp_replace(no_telp, '[^0-9]', '', 'g') = normalized_phone OR
        no_telp = p_phone
    LIMIT 1;
    
    RETURN found_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_email_by_phone(TEXT) TO anon, authenticated;


-- 2. FIX USER_PROFILES RLS (Anti-Recursion)
-- Kita pisahkan policy menjadi simple parts untuk menghindari loop

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_admin" ON user_profiles;

-- Policy 1: User bisa baca profil sendiri (Sangat ringan, dievaluasi dlu)
CREATE POLICY "user_profiles_select_own" ON user_profiles
FOR SELECT USING (
    auth.uid() = user_id
);

-- Policy 2: Admin bisa baca semua
-- Gunakan fungsi security definer khusus untuk cek admin tanpa memicu RLS recursive pada pemanggil
CREATE OR REPLACE FUNCTION is_admin_safe()
RETURNS BOOLEAN AS $$
DECLARE
    is_adm BOOLEAN;
BEGIN
    -- Query langsung ke tabel (bypass RLS karena function ini Security Definer)
    SELECT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid() AND role = 'admin'
    ) INTO is_adm;
    
    RETURN COALESCE(is_adm, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_admin_safe() TO authenticated;

CREATE POLICY "user_profiles_select_admin" ON user_profiles
FOR SELECT USING (
    is_admin_safe()
);

-- Reset policies lain di user_profiles yang mungkin salah
DROP POLICY IF EXISTS "user_profiles_update" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin" ON user_profiles;

CREATE POLICY "user_profiles_update_own" ON user_profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_profiles_modify_admin" ON user_profiles
FOR ALL USING (is_admin_safe());

-- =====================================================
-- 3. PASTIKAN HELPER LAMA JUGA AMAN
-- =====================================================
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Gunakan tabel langsung di dalam function security definer -> Aman
    SELECT role INTO user_role
    FROM user_profiles
    WHERE user_id = auth.uid();
    
    RETURN COALESCE(user_role, 'guest');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
