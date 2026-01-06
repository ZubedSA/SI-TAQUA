-- ==========================================
-- SOLUSI_LOGIN_SIMPLE.sql
-- ==========================================
-- JALANKAN SCRIPT INI DI SQL EDITOR
-- Tujuannya: Memperbaiki user terakhir agar BISA LOGIN.

BEGIN;

-- 1. BERSIHKAN TRIGGER (Penyebab utama error schema)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. RESET PERMISSION (Agar database tidak error saat akses)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO postgres, service_role;

-- 3. PERBAIKI USER TERAKHIR (Otomatis)
DO $$
DECLARE
    v_latest_user_id UUID;
    v_correct_instance_id UUID;
BEGIN
    -- Ambil ID user yang baru saja dibuat
    SELECT id INTO v_latest_user_id FROM auth.users ORDER BY created_at DESC LIMIT 1;
    
    -- Cari Instance ID yang benar dari sistem (bukan 0000...)
    SELECT id INTO v_correct_instance_id FROM auth.instances LIMIT 1;
    
    -- Jika tidak ketemu di tabel instances, cari dari user lain yang normal
    IF v_correct_instance_id IS NULL THEN
        SELECT instance_id INTO v_correct_instance_id 
        FROM auth.users 
        WHERE instance_id != '00000000-0000-0000-0000-000000000000' 
        LIMIT 1;
    END IF;

    -- Update User Terakhir
    IF v_latest_user_id IS NOT NULL THEN
        -- Fix Instance ID jika valid
        IF v_correct_instance_id IS NOT NULL THEN
            UPDATE auth.users 
            SET instance_id = v_correct_instance_id 
            WHERE id = v_latest_user_id;
            RAISE NOTICE '✅ Instance ID user terakhir diperbaiki.';
        END IF;

        -- RESET PASSWORD KE '123456' (Biar pasti bisa login)
        -- Kita update langsung hash-nya
        UPDATE auth.users
        SET encrypted_password = crypt('123456', gen_salt('bf'))
        WHERE id = v_latest_user_id;
        
        RAISE NOTICE '✅ Password user terakhir di-reset jadi: 123456';
    END IF;
END $$;

COMMIT;

SELECT '✅ SELESAI. Silakan login user terakhir dengan password: 123456' as status;
