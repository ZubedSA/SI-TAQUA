-- =========================================================================
-- FIX_SYSTEM_INTEGRITY_FINAL.sql
-- "OBAT KUAT" untuk Sistem User
-- Mengembalikan fungsi OTOMATIS Database (Trigger) agar tidak ada user 'hantu' lagi.
-- =========================================================================

BEGIN;

-- 1. BERSIH-BERSIH TOTAL (Hapus semua trigger/function lama yang mungkin bentrok)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. BUAT ULANG TRIGGER OTOMATIS (Sangat Sederhana & Aman)
-- Setiap kali ada user baru di tabel auth.users, otomatis buatkan profilnya.
-- Tidak ada logika aneh-aneh, hanya copy data dasar.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, email, nama, role, active_role, roles)
    VALUES (
        new.id,
        new.email,
        -- Ambil nama dari metadata, atau username, atau depan email
        COALESCE(new.raw_user_meta_data->>'nama', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        -- Role default
        COALESCE(new.raw_user_meta_data->>'role', 'guru'),
        COALESCE(new.raw_user_meta_data->>'active_role', new.raw_user_meta_data->>'role', 'guru'),
        -- Roles array
        CASE 
            WHEN new.raw_user_meta_data->'roles' IS NOT NULL THEN ARRAY(SELECT jsonb_array_elements_text(new.raw_user_meta_data->'roles'))
            ELSE ARRAY[COALESCE(new.raw_user_meta_data->>'role', 'guru')]::text[]
        END
    )
    ON CONFLICT (user_id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        nama = EXCLUDED.nama,
        roles = EXCLUDED.roles;
        
    RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 3. JALANKAN SYNC MANUAL (Untuk user yang "Gagal/Hilang" tadi)
-- Ini akan mencari semua user di Auth yang belum punya profil, dan membuatkannya sekarang juga.
INSERT INTO public.user_profiles (user_id, email, nama, role, active_role, roles)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'nama', split_part(email, '@', 1)), 
    COALESCE(raw_user_meta_data->>'role', 'guru'), 
    COALESCE(raw_user_meta_data->>'active_role', 'guru'),
    ARRAY[COALESCE(raw_user_meta_data->>'role', 'guru')]::text[]
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.user_id = au.id)
ON CONFLICT (user_id) DO NOTHING;


-- 4. PASTIKAN ADMIN TETAP ADMIN
-- Update semua user yang emailnya mengandung 'admin' agar kembali punya akses Admin penuh
UPDATE public.user_profiles
SET 
    role = 'admin',
    active_role = 'admin',
    roles = array_append(roles, 'admin')
WHERE (email ILIKE '%admin%' OR email ILIKE '%zubaidi%')
AND NOT ('admin' = ANY(roles));


-- 5. RELOAD CONFIG SCHEMA (Biar gak error "Schema cache")
NOTIFY pgrst, 'reload config';

COMMIT;

SELECT '✅ SISTEM OTOMATIS DIPULIHKAN. User baru & lama sekarang aman.' as status;
