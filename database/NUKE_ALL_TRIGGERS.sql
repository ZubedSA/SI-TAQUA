-- =====================================================
-- NUKE ALL TRIGGERS (SOLUSI RADIKAL)
-- =====================================================
-- Script ini akan mencari SEMUA Trigger yang menempel pada tabel:
-- 1. auth.users (Tabel Login Utama)
-- 2. public.user_profiles (Tabel Profil)
-- 3. public.santri
-- Dan MENGHAPUSNYA secara otomatis.

-- Tujuannya: Memastikan TIDAK ADA kode otomatis yang error saat User Login.

DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    -- Loop untuk mencari trigger di schema 'auth' dan 'public'
    FOR r IN (
        SELECT trigger_name, event_object_table, event_object_schema 
        FROM information_schema.triggers 
        WHERE event_object_schema IN ('auth', 'public') 
        AND event_object_table IN ('users', 'user_profiles', 'santri')
    ) 
    LOOP 
        -- Eksekusi DROP TRIGGER
        BEGIN
            EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || 
                    ' ON ' || quote_ident(r.event_object_schema) || '.' || quote_ident(r.event_object_table) || ' CASCADE;'; 
            RAISE NOTICE '✅ BERHASIL HAPUS TRIGGER: % pada %.%', r.trigger_name, r.event_object_schema, r.event_object_table;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Gagal hapus trigger % (Mungkin system trigger): %', r.trigger_name, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Pembersihan Trigger Selesai.';
END $$;

-- JUGA DROP FUNCTION UTAMA YANG SERING DIPAKAI TRIGGER
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS sync_user_profile() CASCADE;

-- RELOAD SCHEMA SUPABASE
NOTIFY pgrst, 'reload schema';
