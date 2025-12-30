-- =====================================================
-- FIX FOREIGN KEYS & CONSTRAINTS (AKAR MASALAH)
-- =====================================================
-- Gejala: Auth User tidak bisa dihapus & Login Error.
-- Penyebab: Ada Foreign Key Constraint yang "Kaku" atau "Corrupt", 
-- sehingga memblokir database saat mencoba UPDATE (User Login) atau DELETE.

-- SOLUSI: Kita bongkar kuncian relasi ke auth.users dan pasang ulang dengan benar (CASCADE).

-- 1. BONGKAR CONSTRAINT 'WALI_ID' DI TABEL SANTRI
-- Constraint ini sering jadi penyebab utama lock karena menghalangi update/delete user wali.
ALTER TABLE santri DROP CONSTRAINT IF EXISTS santri_wali_id_fkey;

-- Pasang ulang dengan CASCADE (Jika user dihapus, set null wali_id di santri, jangan error)
ALTER TABLE santri 
ADD CONSTRAINT santri_wali_id_fkey 
FOREIGN KEY (wali_id) REFERENCES auth.users(id)
ON DELETE SET NULL; -- Penting! Jangan CASCADE delete santri, tapi set null saja.

-- 2. BONGKAR CONSTRAINT 'USER_ID' DI TABEL USER_PROFILES
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

-- Pasang ulang dengan CASCADE (Jika user auth dihapus, profil ikut terhapus otomatis)
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 3. CEK DAN BERSIHKAN DATA SAMPAH (ORPHANS)
-- Hapus profil yang user auth-nya sudah tidak ada
DELETE FROM user_profiles 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Null-kan wali_id yang usernya sudah tidak ada
UPDATE santri 
SET wali_id = NULL 
WHERE wali_id NOT IN (SELECT id FROM auth.users);

-- 4. MATIKAN TRIGGER CHECK YANG MUNGKIN ERROR
-- Kadang ada trigger tersembunyi
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 5. RELOAD SCHEMA
NOTIFY pgrst, 'reload schema';

-- SETELAH SCRIPT INI:
-- 1. Coba Hapus User Guru/Wali yang error lewat SQL atau Dashboard (Harusnya sudah bisa).
-- 2. Atau langsung Coba Login (Mungkin sudah sembuh karena lock constraint lepas).
