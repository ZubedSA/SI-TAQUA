-- =====================================================
-- FIX: RELASI TABEL SUSPICIOUS_ACCOUNTS
-- =====================================================
-- Masalah: Frontend error 400 karena tidak bisa join 'suspicious_accounts' dengan 'user_profiles'.
-- Penyebab: FK 'user_id' saat ini mengarah ke 'auth.users', bukan 'user_profiles'.
-- Solusi: Ubah FK agar mengarah ke 'user_profiles' (public schema).

BEGIN;

-- 1. Drop Constraint Lama (yang ke auth.users)
-- Nama constraint default biasanya: suspicious_accounts_user_id_fkey
ALTER TABLE suspicious_accounts
DROP CONSTRAINT IF EXISTS suspicious_accounts_user_id_fkey;

-- 2. Drop Constraint lain jika ada (judi nama jika di-create manual/beda)
ALTER TABLE suspicious_accounts
DROP CONSTRAINT IF EXISTS suspicious_user_id_fkey;

-- 3. Tambahkan Constraint Baru (ke user_profiles)
ALTER TABLE suspicious_accounts
ADD CONSTRAINT suspicious_accounts_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES user_profiles(user_id)
ON DELETE CASCADE;

COMMIT;

-- Verifikasi
SELECT 'FIX COMPLETE: Relationship updated to user_profiles' as status;
