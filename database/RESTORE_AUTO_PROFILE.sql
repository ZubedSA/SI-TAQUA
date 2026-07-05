-- =========================================================================
-- RESTORE_AUTO_PROFILE.sql
-- Membuat ulang trigger otomatis agar user baru otomatis punya profil
-- =========================================================================

-- 1. Buat function untuk handle user baru
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, email, nama, role, active_role, roles, username)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'nama', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'role', 'guru'),
        COALESCE(new.raw_user_meta_data->>'role', 'guru'),
        ARRAY[COALESCE(new.raw_user_meta_data->>'role', 'guru')]::text[],
        new.raw_user_meta_data->>'username'
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN new;
EXCEPTION WHEN OTHERS THEN
    -- Jangan sampai error di trigger menggagalkan proses signup
    RAISE WARNING 'Trigger handle_new_user error: %', SQLERRM;
    RETURN new;
END;
$$;

-- 2. Buat trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Sync user yang sudah ada tapi belum punya profil
INSERT INTO public.user_profiles (user_id, email, nama, role, active_role, roles, username)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'nama', split_part(email, '@', 1)), 
    COALESCE(raw_user_meta_data->>'role', 'guru'), 
    COALESCE(raw_user_meta_data->>'role', 'guru'),
    ARRAY[COALESCE(raw_user_meta_data->>'role', 'guru')]::text[],
    raw_user_meta_data->>'username'
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.user_id = au.id)
ON CONFLICT (user_id) DO NOTHING;

-- 4. Reload
NOTIFY pgrst, 'reload config';

SELECT 
    (SELECT count(*) FROM auth.users) as auth_users,
    (SELECT count(*) FROM public.user_profiles) as profiles,
    'Trigger dibuat & data disync. Refresh browser.' as status;
