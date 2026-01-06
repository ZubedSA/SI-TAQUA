-- ==========================================
-- SETUP_SISTEM_AUTH_BARU.sql
-- ==========================================
-- SCRIPT UTAMA REBUILD AUTH SYSTEM
-- Menghapus cara manual yang rentan error, menggantinya dengan Trigger Otomatis.

BEGIN;

-- 1. BERSIHKAN MASA LALU (Cleanup)
DROP FUNCTION IF EXISTS admin_create_user(TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT); -- Hapus sumber masalah instance_id
DROP FUNCTION IF EXISTS handle_new_user() CASCADE; -- Hapus trigger lama jika ada
DROP FUNCTION IF EXISTS dapatkan_email_dari_username(TEXT); 
DROP FUNCTION IF EXISTS get_email_by_username(TEXT);

-- Hapus trigger yang mungkin conflict
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (SELECT trigger_name FROM information_schema.triggers WHERE event_object_schema = 'auth' AND event_object_table = 'users') LOOP 
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON auth.users CASCADE;'; 
    END LOOP; 
END $$;

-- 2. BUAT FUNGSI UTAMA: UNTUK TRIGGER USER BARU
-- Fungsi ini akan jalan OTOMATIS setiap kali ada user baru dibuat di Auth
CREATE OR REPLACE FUNCTION public.handle_new_auth_user() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert ke tabel user_profiles secara otomatis
  INSERT INTO public.user_profiles (
    user_id,
    email,
    nama,
    username,
    role,
    roles,
    active_role,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nama', split_part(new.email, '@', 1)), -- Ambil nama dari metadata atau email
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), -- Ambil username dari metadata
    COALESCE(new.raw_user_meta_data->>'role', 'santri'), -- Default role santri jika kosong
    ARRAY[COALESCE(new.raw_user_meta_data->>'role', 'santri')], -- Default array roles
    COALESCE(new.raw_user_meta_data->>'role', 'santri'),
    NOW(),
    NOW()
  );
  RETURN new;
END;
$$;

-- 3. PASANG TRIGGER KE AUTH.USERS
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_auth_user();

-- 4. BUAT FUNGSI HELPER: CEK EMAIL DARI USERNAME
-- Agar user bisa login pakai username, kita butuh "intip" emailnya apa
CREATE OR REPLACE FUNCTION public.dapatkan_email_dari_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email TEXT;
BEGIN
    -- Cari di user_profiles (lebih aman dan cepat karena di schema public)
    SELECT email INTO v_email FROM public.user_profiles 
    WHERE LOWER(username) = LOWER(p_username) LIMIT 1;
    
    RETURN v_email; -- Bisa NULL jika tidak ketemu
END;
$$;
GRANT EXECUTE ON FUNCTION public.dapatkan_email_dari_username(TEXT) TO anon, authenticated, service_role;

-- 5. PASTIKAN RLS (KEAMANAN) STANDAR
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Semua user bisa baca profilnya sendiri
DROP POLICY IF EXISTS "User bisa baca profil sendiri" ON public.user_profiles;
CREATE POLICY "User bisa baca profil sendiri" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Admin (dan Guru/Musyrif/Bendahara) bisa baca semua profil (untuk keperluan dashboard)
DROP POLICY IF EXISTS "Staf bisa baca semua profil" ON public.user_profiles;
CREATE POLICY "Staf bisa baca semua profil" ON public.user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() 
            AND (
                role IN ('admin', 'guru', 'musyrif', 'bendahara', 'pengurus') OR 
                'admin' = ANY(roles) OR
                'guru' = ANY(roles) OR
                'musyrif' = ANY(roles) OR
                'bendahara' = ANY(roles) OR
                'pengurus' = ANY(roles)
            )
        )
    );

-- Policy: Public/Anon boleh baca profil (untuk login username lookup) - OPTIONAL tapi membantu debug
-- Kita batasi hanya via fungsi RPC diatas sebenarnya sudah cukup aman.

COMMIT;

SELECT '✅ SISTEM AUTH BARU TERPASANG. Trigger Aktif.' as status;
