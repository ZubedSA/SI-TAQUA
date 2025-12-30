-- =====================================================
-- DIAGNOSA & FIX: ORPHANED USERS (User Tanpa Profil)
-- =====================================================
-- Masalah: Admin bisa login, Wali gagal.
-- Kemungkinan Besar: Akun Wali berhasil dibuat di Auth, TAPI gagal dibuat di tabel User Profiles.
-- Akibatnya: Saat login, sistem mencari data profil yang tidak ada -> Error / Crash.

-- 1. CEK USER YANG TIDAK PUNYA PROFIL
-- Query ini akan menampilkan siapa saja yang "Yatim Piatu" (Ada akun, tidak ada profil)
DO $$
DECLARE
    orphan_count INT;
BEGIN
    SELECT COUNT(*) INTO orphan_count
    FROM auth.users au
    LEFT JOIN public.user_profiles up ON au.id = up.user_id
    WHERE up.user_id IS NULL;

    RAISE NOTICE 'Jumlah User Tanpa Profil: %', orphan_count;
END $$;

-- 2. AUTO-FIX: BUATKAN PROFIL UNTUK MEREKA
-- Kita buatkan profil default agar mereka bisa login dan tidak bikin error system.
INSERT INTO public.user_profiles (user_id, email, nama, role, active_role, roles)
SELECT 
    au.id, 
    au.email, 
    COALESCE(au.raw_user_meta_data->>'nama', 'User Tanpa Nama'),
    'wali', -- Default ke Wali karena ini yang bermasalah
    'wali',
    ARRAY['wali']
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL;

-- 3. FIX FUNCTION get_user_role AGAR LEBIH KUAT
-- Versi ini mengembalikan 'guest' jika profil tidak ditemukan (bukan NULL)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT active_role FROM user_profiles WHERE user_id = auth.uid()),
    'guest'
  );
$$;

GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated, service_role;

-- 4. MATIKAN TRIGGER BAWAAN (Just in case)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 5. RELOAD
NOTIFY pgrst, 'reload schema';

-- SCRIPT INI AMAN DIJALANKAN BERULANG KALI.
