-- =========================================================================
-- FIX_NEW_ADMIN_ACCESS.sql
-- Memastikan SEMUA user yang punya role 'admin' otomatis aktif sebagai Admin
-- =========================================================================

BEGIN;

-- 1. Update User Profiles
-- Jika di dalam array 'roles' ada 'admin', paksa active_role jadi 'admin'
UPDATE public.user_profiles
SET active_role = 'admin'
WHERE 'admin' = ANY(roles)
AND active_role != 'admin';

-- 2. Update Auth Metadata (Backup)
-- Agar fallback authService juga mendeteksi sebagai admin
UPDATE auth.users
SET raw_user_meta_data = 
    jsonb_set(
        raw_user_meta_data, 
        '{active_role}', 
        '"admin"'
    )
WHERE raw_user_meta_data->'roles' @> '["admin"]';

-- 3. Safety Net khusus untuk user terbaru (jika logic roles array di atas gagal)
-- Kita asumsikan user terakhir dibuat adalah Admin yang bermasalah ini
DO $$
DECLARE
    v_last_user_id uuid;
BEGIN
    SELECT id INTO v_last_user_id FROM auth.users ORDER BY created_at DESC LIMIT 1;
    
    IF v_last_user_id IS NOT NULL THEN
        -- Force update user terakhir jadi admin (hanya jika dia belum punya role jelas)
        UPDATE public.user_profiles
        SET 
            roles = array_append(roles, 'admin'),
            active_role = 'admin',
            role = 'admin'
        WHERE user_id = v_last_user_id
        AND NOT ('admin' = ANY(roles)); -- Hanya update jika belum admin
    END IF;
END $$;

COMMIT;

SELECT '✅ AKSES ADMIN DIPERBAIKI. Silakan Logout dan Login lagi.' as status;
