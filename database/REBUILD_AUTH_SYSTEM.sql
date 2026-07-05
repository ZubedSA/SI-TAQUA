-- ============================================================================
-- REBUILD_AUTH_SYSTEM.sql
-- ============================================================================
-- Versi: 1.0 FINAL
-- Tanggal: 31 Desember 2024
-- Deskripsi: Konsolidasi lengkap sistem auth, user management, dan relasi wali
-- ============================================================================
-- 
-- JALANKAN FILE INI DI SUPABASE DASHBOARD → SQL EDITOR
-- File ini akan:
-- 1. Hapus semua trigger bermasalah di auth.users
-- 2. Pastikan extension pgcrypto aktif
-- 3. Buat/update semua RPC function yang diperlukan
-- 4. Konfigurasi RLS policy dengan benar
-- 5. Pastikan struktur tabel user_profiles lengkap
--
-- ============================================================================

-- ============================================================================
-- LANGKAH 1: HAPUS SEMUA TRIGGER DI AUTH.USERS
-- ============================================================================
-- Trigger pada auth.users sering menyebabkan error 500 saat update password/email
-- Kita hapus semua dan biarkan Supabase menangani auth secara native

DO $$ 
DECLARE 
    r RECORD;
    trigger_count INT := 0;
BEGIN 
    FOR r IN (
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_schema = 'auth' 
        AND event_object_table = 'users' 
    ) 
    LOOP 
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON auth.users CASCADE;'; 
        RAISE NOTICE '🔥 Trigger dihapus: %', r.trigger_name;
        trigger_count := trigger_count + 1;
    END LOOP; 
    
    IF trigger_count = 0 THEN
        RAISE NOTICE '✅ Tidak ada trigger di auth.users (sudah bersih)';
    ELSE
        RAISE NOTICE '✅ Total % trigger dihapus dari auth.users', trigger_count;
    END IF;
END $$;

-- Hapus function trigger lama yang mungkin masih ada
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS on_auth_user_created() CASCADE;
DROP FUNCTION IF EXISTS public.on_auth_user_created() CASCADE;

SELECT '✅ LANGKAH 1 SELESAI: Semua trigger auth.users sudah dihapus' as status;

-- ============================================================================
-- LANGKAH 2: PASTIKAN EXTENSION PGCRYPTO AKTIF
-- ============================================================================
-- Diperlukan untuk fungsi crypt() dan gen_salt() di RPC password

CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;

SELECT '✅ LANGKAH 2 SELESAI: Extension pgcrypto sudah aktif' as status;

-- ============================================================================
-- LANGKAH 3: PASTIKAN STRUKTUR TABEL USER_PROFILES LENGKAP
-- ============================================================================

-- Tambah kolom yang mungkin belum ada
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS active_role VARCHAR(50);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Index untuk username lookup
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

SELECT '✅ LANGKAH 3 SELESAI: Struktur tabel user_profiles sudah lengkap' as status;

-- ============================================================================
-- LANGKAH 4: RPC - GET_EMAIL_BY_USERNAME
-- ============================================================================
-- Digunakan untuk login via username (lookup email dari username)

DROP FUNCTION IF EXISTS get_email_by_username(TEXT);

CREATE OR REPLACE FUNCTION get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email TEXT;
BEGIN
    -- Cek di user_profiles dulu (sumber utama)
    SELECT email INTO v_email
    FROM user_profiles
    WHERE LOWER(username) = LOWER(p_username)
    LIMIT 1;
    
    -- Jika tidak ketemu di profiles, coba cari di auth.users raw_user_meta_data
    IF v_email IS NULL THEN
        SELECT email INTO v_email
        FROM auth.users
        WHERE LOWER(raw_user_meta_data->>'username') = LOWER(p_username)
        LIMIT 1;
    END IF;
    
    RETURN v_email;
END;
$$;

-- Grant akses untuk semua (diperlukan saat login)
GRANT EXECUTE ON FUNCTION get_email_by_username(TEXT) TO anon, authenticated, service_role;

SELECT '✅ LANGKAH 4 SELESAI: RPC get_email_by_username sudah dibuat' as status;

-- ============================================================================
-- LANGKAH 5: RPC - GET_USER_ROLE
-- ============================================================================
-- Digunakan untuk mendapatkan role user saat ini

DROP FUNCTION IF EXISTS get_user_role() CASCADE;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT COALESCE(active_role, role, 'guest') 
    FROM user_profiles 
    WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated, service_role;

SELECT '✅ LANGKAH 5 SELESAI: RPC get_user_role sudah dibuat' as status;

-- ============================================================================
-- LANGKAH 6: RPC - ADMIN_RESET_PASSWORD
-- ============================================================================
-- Digunakan admin untuk reset password user lain

DROP FUNCTION IF EXISTS admin_reset_password(UUID, TEXT);

CREATE OR REPLACE FUNCTION admin_reset_password(
    target_user_id UUID,
    new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public, auth
AS $$
DECLARE
    v_rows INT;
    v_caller_role TEXT;
BEGIN
    -- A. Cek apakah caller adalah admin
    SELECT COALESCE(
        (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()),
        'guest'
    ) INTO v_caller_role;
    
    -- Cek juga di array roles
    IF v_caller_role != 'admin' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid()
            AND 'admin' = ANY(roles)
        ) THEN
            RETURN jsonb_build_object(
                'success', false, 
                'message', 'Unauthorized: Hanya admin yang bisa reset password'
            );
        END IF;
    END IF;

    -- B. Validasi password
    IF new_password IS NULL OR LENGTH(new_password) < 6 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Password minimal 6 karakter'
        );
    END IF;

    -- C. Update password di auth.users
    UPDATE auth.users
    SET 
        encrypted_password = crypt(new_password, gen_salt('bf')),
        updated_at = NOW()
    WHERE id = target_user_id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;

    IF v_rows > 0 THEN
        -- Sync timestamp di profile
        UPDATE public.user_profiles 
        SET updated_at = NOW() 
        WHERE user_id = target_user_id;
        
        RETURN jsonb_build_object(
            'success', true, 
            'message', 'Password berhasil direset'
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'User tidak ditemukan'
        );
    END IF;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false, 
        'message', 'Database Error: ' || SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_reset_password(UUID, TEXT) TO authenticated;

SELECT '✅ LANGKAH 6 SELESAI: RPC admin_reset_password sudah dibuat' as status;

-- ============================================================================
-- LANGKAH 7: RPC - ADMIN_UPDATE_USER_EMAIL
-- ============================================================================
-- Digunakan admin untuk update data user (email, profile, dll)
-- Juga digunakan user untuk update email sendiri

DROP FUNCTION IF EXISTS admin_update_user_email(UUID, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT);

CREATE OR REPLACE FUNCTION admin_update_user_email(
    target_user_id UUID,
    new_email TEXT,
    new_username TEXT DEFAULT NULL,
    new_full_name TEXT DEFAULT NULL,
    new_role TEXT DEFAULT NULL,
    new_roles TEXT[] DEFAULT NULL,
    new_active_role TEXT DEFAULT NULL,
    new_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_is_admin BOOLEAN := FALSE;
    v_is_self BOOLEAN := FALSE;
BEGIN
    -- A. Identifikasi caller
    v_caller_id := auth.uid();
    
    -- Cek apakah update diri sendiri
    v_is_self := (v_caller_id = target_user_id);
    
    -- Cek apakah caller adalah admin
    SELECT COALESCE(role, '') INTO v_caller_role
    FROM public.user_profiles
    WHERE user_id = v_caller_id;
    
    IF v_caller_role = 'admin' THEN
        v_is_admin := TRUE;
    ELSE
        -- Cek di array roles
        IF EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = v_caller_id AND 'admin' = ANY(roles)
        ) THEN
            v_is_admin := TRUE;
        END IF;
    END IF;
    
    -- B. Validasi permission
    -- Hanya admin atau user sendiri yang bisa update
    IF NOT v_is_admin AND NOT v_is_self THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Unauthorized: Tidak punya akses untuk update user ini'
        );
    END IF;
    
    -- C. Update email di auth.users (jika ada)
    IF new_email IS NOT NULL AND new_email != '' THEN
        UPDATE auth.users
        SET 
            email = new_email,
            email_confirmed_at = NOW(), -- Auto confirm
            updated_at = NOW()
        WHERE id = target_user_id;
    END IF;
    
    -- D. Update profile di user_profiles
    UPDATE public.user_profiles
    SET
        email = COALESCE(new_email, email),
        username = COALESCE(new_username, username),
        nama = COALESCE(new_full_name, nama),
        role = COALESCE(new_role, role),
        roles = COALESCE(new_roles, roles),
        active_role = COALESCE(new_active_role, active_role),
        phone = COALESCE(new_phone, phone),
        updated_at = NOW()
    WHERE user_id = target_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'User berhasil diupdate'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'message', 'Database Error: ' || SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_user_email(UUID, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT) TO authenticated;

SELECT '✅ LANGKAH 7 SELESAI: RPC admin_update_user_email sudah dibuat' as status;

-- ============================================================================
-- LANGKAH 8: RPC - DELETE_USER_COMPLETELY
-- ============================================================================
-- Digunakan admin untuk hapus user sepenuhnya (auth + profile)

DROP FUNCTION IF EXISTS delete_user_completely(UUID);

CREATE OR REPLACE FUNCTION delete_user_completely(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_caller_role TEXT;
BEGIN
    -- A. Cek apakah caller adalah admin
    SELECT COALESCE(role, '') INTO v_caller_role
    FROM public.user_profiles
    WHERE user_id = auth.uid();
    
    IF v_caller_role != 'admin' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND 'admin' = ANY(roles)
        ) THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Unauthorized: Hanya admin yang bisa menghapus user'
            );
        END IF;
    END IF;
    
    -- B. Hapus link wali-santri dulu (set wali_id = null)
    UPDATE public.santri
    SET wali_id = NULL
    WHERE wali_id = p_user_id;
    
    -- C. Hapus dari user_profiles
    DELETE FROM public.user_profiles
    WHERE user_id = p_user_id;
    
    -- D. Hapus dari auth.users
    DELETE FROM auth.users
    WHERE id = p_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'User berhasil dihapus sepenuhnya'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Database Error: ' || SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_completely(UUID) TO authenticated;

SELECT '✅ LANGKAH 8 SELESAI: RPC delete_user_completely sudah dibuat' as status;

-- ============================================================================
-- LANGKAH 9: KONFIGURASI RLS (ROW LEVEL SECURITY)
-- ============================================================================
-- PENTING: Hindari self-referencing subquery yang menyebabkan infinite loop!

-- Hapus semua policy lama
DROP POLICY IF EXISTS "Admin full access" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_policy" ON user_profiles;
DROP POLICY IF EXISTS "admin_full_access" ON user_profiles;
DROP POLICY IF EXISTS "user_view_own" ON user_profiles;
DROP POLICY IF EXISTS "user_update_own" ON user_profiles;
DROP POLICY IF EXISTS "service_role_bypass" ON user_profiles;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- SOLUSI: Gunakan pendekatan sederhana tanpa self-reference

-- Explicitly drop policies to be created to ensure idempotency
DROP POLICY IF EXISTS "authenticated_select_all" ON user_profiles;
DROP POLICY IF EXISTS "user_update_own" ON user_profiles;
DROP POLICY IF EXISTS "service_role_all" ON user_profiles;
DROP POLICY IF EXISTS "authenticated_insert" ON user_profiles;

-- Policy 1: Semua authenticated user bisa SELECT semua profiles
-- (Admin perlu lihat semua user, dan user perlu lihat profile sendiri)
CREATE POLICY "authenticated_select_all" ON user_profiles
FOR SELECT TO authenticated
USING (true);

-- Policy 2: User hanya bisa UPDATE profile sendiri
CREATE POLICY "user_update_own" ON user_profiles
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy 3: Service role bypass (untuk backend operations)
CREATE POLICY "service_role_all" ON user_profiles
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Policy 4: Admin INSERT (via trigger auth akan langsung insert)
-- Untuk INSERT kita izinkan semua authenticated karena signup flow
CREATE POLICY "authenticated_insert" ON user_profiles
FOR INSERT TO authenticated
WITH CHECK (true);

-- Policy 5: Admin DELETE (hanya melalui RPC delete_user_completely)
-- Tidak ada direct DELETE policy, harus via RPC

SELECT '✅ LANGKAH 9 SELESAI: RLS policies sudah dikonfigurasi (tanpa self-reference)' as status;

-- ============================================================================
-- LANGKAH 10: RELOAD SCHEMA CACHE
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFIKASI AKHIR
-- ============================================================================

SELECT '========================================' as separator;
SELECT '✅ REBUILD AUTH SYSTEM SELESAI!' as status;
SELECT '========================================' as separator;

-- Cek tidak ada trigger
SELECT 
    CASE WHEN COUNT(*) = 0 
        THEN '✅ Tidak ada trigger di auth.users' 
        ELSE '⚠️ Masih ada ' || COUNT(*) || ' trigger di auth.users'
    END as trigger_status
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' AND event_object_table = 'users';

-- Cek semua RPC function ada
SELECT 
    routine_name as rpc_function,
    '✅ Tersedia' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_email_by_username', 
    'get_user_role',
    'admin_reset_password', 
    'admin_update_user_email', 
    'delete_user_completely'
)
ORDER BY routine_name;

SELECT '========================================' as separator;
SELECT 'Silakan test login di aplikasi!' as next_step;
