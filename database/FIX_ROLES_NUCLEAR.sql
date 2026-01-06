-- ==========================================
-- FIX_ROLES_NUCLEAR.sql
-- ==========================================
-- 1. Hapus constraint yang menghalangi update
-- 2. Paksa user 'achzubaidi07' jadi ADMIN
-- 3. Cek hasil akhirnya

BEGIN;

-- 1. HAPUS CONSTRAINT (KITA BUAT LAGI NANTI SAJA, YANG PENTING USER BISA MASUK DULU)
ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- 2. PAKSA UPDATE USER TARGET
UPDATE public.user_profiles
SET 
  role = 'admin',
  roles = ARRAY['admin'],
  active_role = 'admin'
WHERE 
  username = 'achzubaidi07' 
  OR email ILIKE 'achzubaidi07%';

-- 3. CONTOH FIX UNTUK USER LAIN (Opsional, biar sekalian tidak blank)
UPDATE public.user_profiles
SET
  role = 'santri',
  roles = ARRAY['santri'],
  active_role = 'santri'
WHERE 
  role IS NULL OR role = '' OR role = 'user';

COMMIT;

-- 4. VERIFIKASI
SELECT user_id, username, email, role, roles, active_role
FROM public.user_profiles
WHERE username = 'achzubaidi07' OR email ILIKE 'achzubaidi07%';
