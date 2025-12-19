-- =====================================================
-- SCRIPT LENGKAP: Perbaikan Total Sistem Username Login
-- =====================================================
-- Jalankan script ini SATU KALI untuk fix semua masalah username
-- Script ini aman dijalankan berulang kali

BEGIN;

-- STEP 1: Tambah kolom username jika belum ada
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'username'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN username TEXT;
        RAISE NOTICE '✅ Kolom username berhasil ditambahkan';
    ELSE
        RAISE NOTICE 'ℹ️ Kolom username sudah ada';
    END IF;
END $$;

-- STEP 2: Isi username kosong dengan bagian email sebelum @
UPDATE user_profiles
SET username = split_part(email, '@', 1)
WHERE username IS NULL OR username = '';

-- STEP 3: Pastikan tidak ada username duplikat (tambah suffix unik)
UPDATE user_profiles p1
SET username = username || '_' || SUBSTRING(user_id::text, 1, 4)
WHERE EXISTS (
    SELECT 1 FROM user_profiles p2
    WHERE p1.username = p2.username AND p1.id != p2.id
);

-- STEP 4: Buat index untuk username (percepat pencarian)
DROP INDEX IF EXISTS idx_user_profiles_username;
CREATE INDEX idx_user_profiles_username ON user_profiles(username);

-- STEP 5: Buat/Update function untuk lookup email dari username
CREATE OR REPLACE FUNCTION get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email TEXT;
BEGIN
    -- Case insensitive match
    SELECT email INTO v_email
    FROM user_profiles
    WHERE LOWER(username) = LOWER(p_username)
    LIMIT 1;
    
    RETURN v_email;
END;
$$;

-- STEP 6: Grant permission ke semua role
GRANT EXECUTE ON FUNCTION get_email_by_username(TEXT) TO anon, authenticated, service_role;

COMMIT;

-- VERIFIKASI: Tampilkan semua user dengan username mereka
SELECT 
    email,
    username,
    role,
    CASE 
        WHEN username IS NULL OR username = '' THEN '❌ ERROR'
        ELSE '✅ OK'
    END as status
FROM user_profiles
ORDER BY created_at DESC;

-- Tampilkan instruksi
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ SELESAI! Sistem Username sudah siap.';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Username yang bisa dipakai untuk login:';
END $$;

-- Tampilkan semua username yang valid
SELECT username FROM user_profiles WHERE username IS NOT NULL AND username != '';
