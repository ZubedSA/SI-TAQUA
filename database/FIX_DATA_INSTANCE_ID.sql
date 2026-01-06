-- ==========================================
-- FIX_DATA_INSTANCE_ID.sql
-- ==========================================
-- Masalah Teridentifikasi: User memiliki instance_id '00000000-0000-0000-0000-000000000000'
-- Ini salah untuk environment Supabase Cloud.

BEGIN;

DO $$ 
DECLARE 
    v_real_instance_id UUID;
    v_wrong_id UUID := '00000000-0000-0000-0000-000000000000';
    v_updated_count INT;
BEGIN 
    -- 1. Coba ambil ID dari tabel auth.instances (Biasanya hanya ada 1 baris)
    SELECT id INTO v_real_instance_id FROM auth.instances LIMIT 1;

    -- 2. Jika tidak bisa akses auth.instances, kita tidak bisa menebak.
    IF v_real_instance_id IS NULL THEN
        RAISE NOTICE '⚠️ Gagal mengambil ID dari auth.instances. Tabel kosong atau tidak ada akses.';
        
        -- Fallback: Cek apakah ada user LAIN yang punya ID bukan 0000...
        SELECT instance_id INTO v_real_instance_id
        FROM auth.users
        WHERE instance_id != v_wrong_id
        LIMIT 1;
    END IF;

    -- 3. Eksekusi Update jika ID ditemukan dan berbeda dari 0000...
    IF v_real_instance_id IS NOT NULL AND v_real_instance_id != v_wrong_id THEN
        RAISE NOTICE '✅ Instance ID Valid ditemukan: %', v_real_instance_id;
        
        UPDATE auth.users
        SET instance_id = v_real_instance_id
        WHERE instance_id = v_wrong_id;
        
        GET DIAGNOSTICS v_updated_count = ROW_COUNT;
        RAISE NOTICE '✅ BERHASIL MEMPERBAIKI % user.', v_updated_count;
    ELSE
        RAISE NOTICE '❌ TIDAK BISA MEMPERBAIKI OTOMATIS. Tidak ditemukan referensi ID yang benar.';
        RAISE NOTICE 'SARAN: Buat 1 user manual lewat Supabase Dashboard -> Authentication -> Add User. Lalu jalankan script ini lagi.';
    END IF;

END $$;

COMMIT;
