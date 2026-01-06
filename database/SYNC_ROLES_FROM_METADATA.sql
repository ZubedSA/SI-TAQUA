-- =========================================================================
-- SYNC_ROLES_FROM_METADATA.sql
-- Mengembalikan data Multi-Role yang mungkin hilang
-- =========================================================================

BEGIN;

-- 1. Update roles di user_profiles mengambil dari raw_user_meta_data (jika ada)
-- Ini akan menimpa roles saat ini dengan data dari metadata auth ( yang biasanya lebih lengkap)
UPDATE public.user_profiles up
SET roles = ARRAY(
    SELECT jsonb_array_elements_text(au.raw_user_meta_data->'roles')
)
FROM auth.users au
WHERE up.user_id = au.id
AND au.raw_user_meta_data->'roles' IS NOT NULL
AND jsonb_typeof(au.raw_user_meta_data->'roles') = 'array'
AND jsonb_array_length(au.raw_user_meta_data->'roles') > 0;

-- 2. Pastikan active_role ada di dalam list roles
UPDATE public.user_profiles
SET active_role = roles[1]
WHERE NOT (active_role = ANY(roles));

-- 3. Khusus untuk user Admin (Safety)
UPDATE public.user_profiles
SET roles = array_append(roles, 'admin')
WHERE role = 'admin' AND NOT ('admin' = ANY(roles));

COMMIT;

SELECT '✅ DATA ROLE BERHASIL DISINKRONISASI.' as status;
