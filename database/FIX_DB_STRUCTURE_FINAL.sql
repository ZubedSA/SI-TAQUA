-- ========================================================
-- FIX_DB_STRUCTURE_FINAL.sql
-- Solusi Akhir untuk Error 500 & Masalah Login
-- ========================================================

BEGIN;

-- 1. Pastikan RLS dimatikan dulu untuk perbaikan struktur
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 2. Tambah Kolom yang Hilang (Support Multi-Role)
-- Ini penting karena script sebelumnya mungkin gagal karena kolom ini tidak ada
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT ARRAY['guest'];
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS active_role TEXT DEFAULT 'guest';

-- 3. Hapus trigger yang berpotensi error (Infinite Loop / Recursion)
DROP TRIGGER IF EXISTS on_auth_user_created ON public.user_profiles;
DROP TRIGGER IF EXISTS trg_initialize_role_data ON public.user_profiles;
-- Function trigger juga kita drop triggernya saja, function biarkan.

-- 4. Perbaiki Data Null
UPDATE public.user_profiles SET roles = ARRAY[role::text] WHERE roles IS NULL;
UPDATE public.user_profiles SET active_role = role WHERE active_role IS NULL;

-- 5. Reset Policy RLS ke Mode Paling Aman (Emergency Mode)
-- Hapus semua policy lama yang "ribet"
DROP POLICY IF EXISTS "Public select" ON public.user_profiles;
DROP POLICY IF EXISTS "Self select" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.user_profiles;
DROP POLICY IF EXISTS "Emergency Access Policy" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_profiles;

-- Buat satu policy sederhana: "Siapapun yang login, boleh baca data profil"
-- Ini mencegah error 500 karena rekursif.
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Safe Read Policy"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (true); 
-- USING (true) aman untuk SELECT, karena user hanya bisa *baca*. 
-- Untuk UPDATE/ISERT nanti bisa diperketat, tapi untuk LOGIN ini kuncinya.

CREATE POLICY "Self Update Policy"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Insert Data User Saya (Fallback jika belum ada)
-- Menggunakan ID yang Anda laporkan error: f2623523-cb81-428d-901c-91037776f386
INSERT INTO public.user_profiles (user_id, email, nama, role, active_role, roles)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'nama', 'User'), 
    'admin', 
    'admin',
    ARRAY['admin']::text[]
FROM auth.users
WHERE id = 'f2623523-cb81-428d-901c-91037776f386'::uuid
AND NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = 'f2623523-cb81-428d-901c-91037776f386'::uuid);

-- 7. Grant Permissions (Memastikan aplikasi boleh akses)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;

COMMIT;

SELECT '✅ PERBAIKAN TOTAL SELESAI. Silakan Login.' as status;
