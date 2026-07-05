-- =====================================================
-- FINAL LOGIN & SECURITY FIX (ULTIMATE EDITION)
-- =====================================================
-- Script ini menggabungkan semua perbaikan:
-- 1. Logika Login HP ULTRA AMAN (Prefix Stripping)
-- 2. Keamanan RLS User Profile (Anti-Loop)
-- =====================================================

-- 1. FUNGSI LOOKUP YANG LEBIH PINTAR
-- Menangani 08xx, 62xx, dan nomor pendek/test sekalipun
CREATE OR REPLACE FUNCTION get_email_by_phone(p_phone TEXT)
RETURNS TEXT AS $$
DECLARE
    found_email TEXT;
    clean_input TEXT;
BEGIN
    -- A. Bersihkan input (hanya angka)
    clean_input := regexp_replace(p_phone, '[^0-9]', '', 'g');
    
    -- B. Standardisasi Input (Hapus 62 atau 0 di depan)
    -- Agar tersisa angka intinya saja (misal: 8123456789)
    
    -- Jika diawali 62, hapus
    IF LEFT(clean_input, 2) = '62' THEN
        clean_input := SUBSTRING(clean_input, 3);
    -- Jika diawali 0, hapus
    ELSIF LEFT(clean_input, 1) = '0' THEN
        clean_input := SUBSTRING(clean_input, 2);
    END IF;

    -- C. Cari di Database
    -- Kita cari record yang "Core Number"-nya cocok
    SELECT email INTO found_email
    FROM user_profiles
    WHERE 
        -- Logic: Apakah no_telp di DB mengandung clean_input KITA?
        -- Atau clean_input KITA mengandung no_telp di DB? (Saling mencocokkan)
        regexp_replace(no_telp, '[^0-9]', '', 'g') LIKE '%' || clean_input
        OR
        clean_input LIKE '%' || regexp_replace(no_telp, '[^0-9]', '', 'g')
    LIMIT 1;
    
    RETURN found_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION get_email_by_phone(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_email_by_phone(TEXT) TO anon, authenticated;

-- 2. PERBAIKI RLS USER_PROFILES (MENCEGAH INFINITE LOOP)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Reset Policy
DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_admin" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin" ON user_profiles;
DROP POLICY IF EXISTS "Allow all access" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_modify_admin" ON user_profiles;

-- Helper Check Admin
CREATE OR REPLACE FUNCTION is_admin_safe()
RETURNS BOOLEAN AS $$
DECLARE
    is_adm BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid() AND role = 'admin'
    ) INTO is_adm;
    
    RETURN COALESCE(is_adm, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_admin_safe() TO authenticated;

-- Policy Baru
CREATE POLICY "user_profiles_select_own" ON user_profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_profiles_select_admin" ON user_profiles
FOR SELECT USING (is_admin_safe());

CREATE POLICY "user_profiles_update_own" ON user_profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_profiles_modify_admin" ON user_profiles
FOR ALL USING (is_admin_safe());
