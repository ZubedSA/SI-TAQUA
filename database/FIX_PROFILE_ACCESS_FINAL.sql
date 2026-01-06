-- ==========================================
-- FIX_PROFILE_ACCESS_FINAL.sql
-- ==========================================
-- SOLUSI PERMASALAHAN "BLANK SCREEN" / "TIDAK ADA TAMPILAN"

-- ANALISA:
-- User berhasil login, tapi aplikasi tidak bisa membaca "Jabatan/Role" user tersebut.
-- Akibatnya, aplikasi menganggap user tersebut sebagai "Tamu" (Guest) dan menyembunyikan semua menu.
-- Penyebab utama: Izin Baca (Select Policy) di tabel user_profiles terkunci/salah.

BEGIN;

-- 1. BUKA KUNCI TABEL PROFIL (FIX RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama yang mungkin salah/memblokir
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Public profiles access" ON public.user_profiles;
DROP POLICY IF EXISTS "User bisa baca profil sendiri" ON public.user_profiles;
DROP POLICY IF EXISTS "Staf bisa baca semua profil" ON public.user_profiles;

-- Buat Policy BARU yang SANGAT JELAS & SEDERHANA
-- "Setiap user yang login BOLEH melihat data profilnya sendiri"
CREATE POLICY "User bisa baca profil sendiri" 
ON public.user_profiles FOR SELECT 
USING (auth.uid() = user_id);

-- "Admin BOLEH melihat data profil siapa saja"
CREATE POLICY "Admin bisa baca semua" 
ON public.user_profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 2. PAKSA ULANG ROLE ADMIN (Untuk user achzubaidi07)
-- Kita update lagi untuk memastikan datanya benar
UPDATE public.user_profiles
SET 
  role = 'admin',
  roles = ARRAY['admin'],
  active_role = 'admin',
  nama = 'Super Admin', -- Kita kasih nama jelas biar kelihatan bedanya
  updated_at = NOW()
WHERE 
  username = 'achzubaidi07' 
  OR email ILIKE 'achzubaidi07%';

COMMIT;

-- 3. TEST HASILNYA (Simulasi apakah bisa dibaca?)
SELECT 'Data User Target:' as info, username, email, role, active_role 
FROM public.user_profiles 
WHERE username = 'achzubaidi07' OR email ILIKE 'achzubaidi07%';
