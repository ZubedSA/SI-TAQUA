-- =========================================================================
-- FIX_OTA_AUTO_INSERT.sql
-- PERBAIKAN: Menghapus logika auto-insert ke orang_tua_asuh dari trigger
-- 
-- MASALAH: Setiap user baru yang dibuat otomatis masuk ke tabel orang_tua_asuh
--          jika memiliki role 'ota'. Ini menyebabkan data OTA "terisi sendiri".
-- 
-- SOLUSI: Hapus logika OTA dari trigger initialize_role_data.
--         OTA harus dikelola secara manual melalui form OTA, bukan via trigger.
-- =========================================================================

BEGIN;

-- =====================================================
-- STEP 1: Recreate initialize_role_data WITHOUT OTA logic
-- =====================================================

CREATE OR REPLACE FUNCTION public.initialize_role_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_nama TEXT;
    v_new_role TEXT;
    v_new_roles TEXT[];
BEGIN
    v_user_id := NEW.user_id;
    v_email := COALESCE(NEW.email, '');
    v_nama := COALESCE(NEW.nama, 'User');
    v_new_role := COALESCE(NEW.role, '');
    v_new_roles := COALESCE(NEW.roles, ARRAY[]::TEXT[]);

    -- ========================================
    -- OTA ROLE - REMOVED (Managed manually via OTAForm)
    -- OTA tidak lagi auto-insert dari trigger.
    -- Jika user membutuhkan akses Dashboard OTA, mereka tetap bisa login,
    -- tapi data profil OTA harus dibuat manual dari menu "Data Orang Tua Asuh"
    -- ========================================
    -- IF v_new_role = 'ota' OR 'ota' = ANY(v_new_roles) THEN
    --     IF NOT EXISTS (SELECT 1 FROM orang_tua_asuh WHERE user_id = v_user_id) THEN
    --         INSERT INTO orang_tua_asuh (user_id, nama, email, status)
    --         VALUES (v_user_id, v_nama, v_email, TRUE);
    --         RAISE NOTICE 'Auto-created OTA profile for user: %', v_user_id;
    --     END IF;
    -- END IF;

    -- ========================================
    -- CHECK FOR GURU ROLE (KEPT)
    -- ========================================
    IF v_new_role = 'guru' OR 'guru' = ANY(v_new_roles) THEN
        IF NOT EXISTS (SELECT 1 FROM guru WHERE user_id = v_user_id) THEN
            UPDATE guru SET user_id = v_user_id
            WHERE LOWER(nama) = LOWER(v_nama) AND user_id IS NULL
            AND id = (SELECT MIN(id) FROM guru WHERE LOWER(nama) = LOWER(v_nama) AND user_id IS NULL);
            
            IF NOT FOUND THEN
                INSERT INTO guru (nama, user_id, nip, jenis_kelamin, status)
                VALUES (
                    v_nama, 
                    v_user_id, 
                    'AUTO-' || SUBSTRING(v_user_id::TEXT, 1, 8), 
                    'Laki-laki', 
                    'Aktif'
                );
            END IF;
            
            RAISE NOTICE 'Auto-created/linked Guru profile for user: %', v_user_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- =====================================================
-- STEP 2: Clean up existing auto-created OTA data
-- Hapus OTA yang dibuat otomatis (yang tidak memiliki data lengkap)
-- =====================================================

-- Tandai OTA yang dibuat via trigger (biasanya tidak punya no_hp, alamat, kategori)
-- Kita TIDAK menghapusnya otomatis untuk safety, tapi bisa di-query untuk review

-- Query untuk melihat OTA yang kemungkinan auto-created:
-- SELECT id, nama, email, no_hp, alamat, kategori_id, created_at
-- FROM orang_tua_asuh
-- WHERE no_hp IS NULL AND alamat IS NULL AND kategori_id IS NULL;

-- OPTIONAL: Uncomment baris di bawah untuk menghapus OTA yang tidak punya data kontak
-- DELETE FROM orang_tua_asuh 
-- WHERE no_hp IS NULL AND alamat IS NULL AND kategori_id IS NULL;

-- =====================================================
-- STEP 3: Reload schema cache
-- =====================================================
NOTIFY pgrst, 'reload config';

COMMIT;

SELECT '✅ Trigger OTA auto-insert telah dinonaktifkan. OTA harus dibuat manual via form.' AS status;
