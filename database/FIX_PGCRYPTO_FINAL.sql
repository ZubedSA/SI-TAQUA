-- =====================================================
-- BENAR-BENAR FINAL FIX: PGCRYPTO PATH
-- =====================================================

-- 1. Pastikan Extension Pgcrypto Ada
-- Supabase biasanya install di schema 'extensions'.
-- Kita coba create di 'extensions' dulu, kalau error berarti sudah ada atau schema beda.
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not create in extensions, trying public...';
        CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;
END$$;

-- 2. Perbaiki Fungsi dengan Search Path yang SMART
-- Kita set search_path function-nya agar melihat ke 'extensions' DAN 'public'.
-- Jadi dimanapun pgcrypto berada, dia akan ketemu.

CREATE OR REPLACE FUNCTION admin_reset_password(
    target_user_id UUID,
    new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
-- VITAL: Urutan search path (extensions dulu, baru public)
SET search_path = extensions, public, auth
AS $$
DECLARE
    v_rows INT;
BEGIN
    -- A. Cek Permission (Admin ATAU Diri Sendiri)
    -- Kita harus qualify tabel user_profiles dengan 'public' karena search_path diubah
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR 'admin' = ANY(roles) OR user_id = target_user_id)
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Admin access or Self-update required');
    END IF;

    -- B. Update Password di auth.users
    -- HAPUS 'public.' atau 'extensions.' prefix. Biarkan search_path yang bekerja.
    UPDATE auth.users
    SET 
        encrypted_password = crypt(new_password, gen_salt('bf')),
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
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Database Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_reset_password TO authenticated;
