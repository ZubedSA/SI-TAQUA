-- ==========================================
-- TEST_LOGIN_DB_SIDE.sql
-- ==========================================
-- Script ini menirukan proses Login Supabase untuk mencari tahu
-- kenapa "Database error" muncul. Kita akan melihat error aslinya.

DO $$
DECLARE
    v_user_email TEXT;
    v_user_pass TEXT := '123456'; -- GANTI INI sesuai password user baru anda
    v_user_id UUID;
    v_db_pass TEXT;
    v_instance_id UUID;
    
    v_check_pass BOOLEAN;
    v_extension_schema TEXT;
BEGIN
    RAISE NOTICE '--- MEMULAI DIAGNOSA LOGIN ---';

    -- 1. Ambil User Terakhir dibuat
    SELECT email, id, encrypted_password, instance_id 
    INTO v_user_email, v_user_id, v_db_pass, v_instance_id
    FROM auth.users
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_user_email IS NULL THEN
        RAISE EXCEPTION '❌ Tidak ada user di database!';
    END IF;

    RAISE NOTICE 'User Test: % (ID: %)', v_user_email, v_user_id;
    RAISE NOTICE 'Instance ID: %', v_instance_id;

    -- 2. Cek apakah pgcrypto bisa diakses
    BEGIN
        SELECT nspname INTO v_extension_schema
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE proname = 'crypt'
        LIMIT 1;
        
        RAISE NOTICE '✅ Fungsi Crypt ditemukan di schema: %', v_extension_schema;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Fungsi Crypt TIDAK DITEMUKAN atau Tidak bisa diakses!';
        RAISE NOTICE 'Error Details: %', SQLERRM;
    END;

    -- 3. Cek Instance ID (Wajib valid)
    IF v_instance_id = '00000000-0000-0000-0000-000000000000' THEN
         RAISE NOTICE '⚠️ PERINGATAN: Instance ID masih 0000... (Invalid di Cloud)';
    END IF;

    -- 4. SIMULASI LOGIN (Verify Password)
    -- Ini adalah logik yang dilakukan GoTrue
    BEGIN
        -- Coba verifikasi password (hash vs hash)
        IF v_db_pass = crypt(v_user_pass, v_db_pass) THEN
            RAISE NOTICE '✅ Password Match! (Logic database aman)';
        ELSE
             -- Coba cek apakah passwordnya 'test1234' atau '123456' (common testing)
             IF v_db_pass = crypt('test1234', v_db_pass) THEN
                RAISE NOTICE '⚠️ Password salah di input, tapi MATCH dengan test1234';
             ELSIF v_db_pass = crypt('123456', v_db_pass) THEN
                RAISE NOTICE '⚠️ Password salah di input, tapi MATCH dengan 123456';
             ELSE
                RAISE NOTICE '❌ Password verification FAILED (Mungkin salah password, atau salt beda)';
             END IF;
        END IF;

    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ ERROR SAAT VERIFIKASI PASSWORD: %', SQLERRM;
        RAISE NOTICE 'Inilah penyebab "Database error querying schema" anda!';
    END;

    -- 5. Cek Permission Table Session (User bisa insert sesi?)
    BEGIN
        -- Dummy check permission
        PERFORM * FROM auth.sessions LIMIT 1;
        RAISE NOTICE '✅ Akses baca auth.sessions OK';
    EXCEPTION WHEN OTHERS THEN
         RAISE NOTICE '❌ Akses baca auth.sessions GAGAL: %', SQLERRM;
    END;

    RAISE NOTICE '--- DIAGNOSA SELESAI ---';
END $$;
