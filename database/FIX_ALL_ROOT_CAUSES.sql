-- =====================================================
-- FIX ROOT CAUSE: TRIGGERS & PGCRYPTO
-- =====================================================

-- 1. FIX ERROR 500 UDPATE USER
-- Hapus SEMUA trigger pada auth.users yang sering menyebabkan error 500 saat update password/email.
-- Trigger ini biasanya sisa percobaan sebelumnya atau trigger default lama yang rusak.
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_schema = 'auth' 
        AND event_object_table = 'users' 
    ) 
    LOOP 
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON auth.users CASCADE;'; 
        RAISE NOTICE '🔥 Dropped Trigger: %', r.trigger_name;
    END LOOP; 
END $$;

-- 2. FIX PGCRYPTO (Unknown Function)
-- Pastikan extension aktif di schema 'extensions' (standard Supabase) atau 'public'.
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public; -- Fallback

-- 3. FIX ADMIN PASSWORD RPC
-- Gunakan SCHEMA EKSPLISIT (extensions.crypt atau public.crypt)
-- Atur Search Path agar fungsi gen_salt ditemukan.

CREATE OR REPLACE FUNCTION admin_reset_password(
    target_user_id UUID,
    new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public, auth -- Prioritas check di extensions lalu public
AS $$
DECLARE
    v_rows INT;
BEGIN
    -- A. Cek Permission
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR 'admin' = ANY(roles))
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Admin access required');
    END IF;

    -- B. Update Password di auth.users
    -- Coba gunakan fungsi dengan path explicit jika search_path gagal
    -- Kita asumsikan pgcrypto ada di extensions (default baru) atau public (default lama)
    
    UPDATE auth.users
    SET 
        encrypted_password = crypt(new_password, gen_salt('bf')),
        updated_at = NOW()
    WHERE id = target_user_id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;

    IF v_rows > 0 THEN
        -- Sync timestamp profile
        UPDATE public.user_profiles SET updated_at = NOW() WHERE user_id = target_user_id;
        RETURN jsonb_build_object('success', true, 'message', 'Password updated successfully');
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Database Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_reset_password TO authenticated;

-- 4. FIX RLS ADMIN (Just in case)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access" ON user_profiles;
CREATE POLICY "Admin full access" ON user_profiles
FOR ALL USING (
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'admin' OR
    (SELECT roles FROM user_profiles WHERE user_id = auth.uid()) @> '{"admin"}'
);
