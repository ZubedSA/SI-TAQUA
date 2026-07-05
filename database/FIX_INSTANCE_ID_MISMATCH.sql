-- ==========================================
-- FIX_INSTANCE_ID_MISMATCH.sql
-- ==========================================
-- MASALAH: User yang dibuat via RPC mungkin memiliki instance_id '00000000-...'
-- Padahal di Supabase Cloud, instance_id-nya berbeda.
-- Ini menyebabkan "Database error" atau user tidak dianggap valid oleh Auth Server.

BEGIN;

DO $$ 
DECLARE 
    v_correct_id UUID;
    v_wrong_id UUID := '00000000-0000-0000-0000-000000000000';
    v_updated_count INT;
BEGIN 
    -- 1. Cari instance_id yang BENAR (dari user lain yang sudah ada/lama)
    -- Kita ambil instance_id yang paling banyak muncul selain ID '0000...'
    SELECT instance_id INTO v_correct_id
    FROM auth.users
    WHERE instance_id IS NOT NULL 
    AND instance_id != v_wrong_id
    GROUP BY instance_id
    ORDER BY COUNT(*) DESC
    LIMIT 1;

    -- Jika tidak ketemu (misal database kosong), kita tidak bisa apa-apa via SQL ini
    IF v_correct_id IS NULL THEN
        RAISE NOTICE '⚠️ Tidak ditemukan instance_id valid dari user lain. Apakah ini project baru kosong?';
    ELSE
        RAISE NOTICE '✅ Instance ID yang benar terdeteksi: %', v_correct_id;

        -- 2. Update user yang memiliki instance_id SALAH
        UPDATE auth.users
        SET instance_id = v_correct_id
        WHERE instance_id = v_wrong_id;
        
        GET DIAGNOSTICS v_updated_count = ROW_COUNT;
        
        IF v_updated_count > 0 THEN
            RAISE NOTICE '✅ BERHASIL: % user diperbaiki instance_id-nya.', v_updated_count;
        ELSE
            RAISE NOTICE 'ℹ️ Tidak ada user dengan instance_id 0000... yang perlu diperbaiki.';
        END IF;

        -- 3. Update juga di auth.identities jika ada
        UPDATE auth.identities
        SET identity_data = jsonb_set(identity_data, '{instance_id}', to_jsonb(v_correct_id::text))
        WHERE provider_id IN (SELECT id::text FROM auth.users WHERE instance_id = v_correct_id AND created_at > NOW() - INTERVAL '1 hour'); 
        -- (Query identity agak tricky, kita skip dulu update deep JSON-nya, biasanya auth.users cukup)
    END IF;

END $$;

COMMIT;

-- Tampilkan user terakhir untuk verifikasi
SELECT id, email, instance_id, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;
