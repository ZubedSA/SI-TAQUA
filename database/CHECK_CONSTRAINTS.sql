-- ==========================================
-- CHECK_CONSTRAINTS.sql
-- ==========================================
-- Cek definisi constraint pada tabel user_profiles
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.user_profiles'::regclass;
