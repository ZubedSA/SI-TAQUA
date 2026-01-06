-- =========================================================================
-- RESTORE_ALL_DATA.sql
-- Mengembalikan SEMUA data akun yang "hilang" dan memastikan Admin bisa lihat
-- =========================================================================

-- 1. MATIKAN RLS TOTAL (Agar tidak ada yang menghalangi akses)
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 2. Sync semua user dari Auth ke Profiles (Agar tidak ada yang hilang)
INSERT INTO public.user_profiles (user_id, email, nama, role, active_role, roles)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'nama', raw_user_meta_data->>'full_name', split_part(email, '@', 1)), 
    COALESCE(raw_user_meta_data->>'role', 'guru'), 
    COALESCE(raw_user_meta_data->>'role', 'guru'),
    ARRAY[COALESCE(raw_user_meta_data->>'role', 'guru')]::text[]
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.user_id = au.id)
ON CONFLICT (user_id) DO NOTHING;

-- 3. Pastikan Admin tetap Admin
UPDATE public.user_profiles 
SET role = 'admin', active_role = 'admin', roles = ARRAY['admin']::text[]
WHERE email ILIKE '%zubaidi%' OR email ILIKE '%admin%';

-- 4. Grant full access
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO anon;
GRANT ALL ON public.user_profiles TO service_role;

-- 5. Tampilkan jumlah data sekarang
SELECT 
    (SELECT count(*) FROM auth.users) as total_auth_users,
    (SELECT count(*) FROM public.user_profiles) as total_profiles,
    'Data disinkronkan. Refresh browser Anda.' as status;
