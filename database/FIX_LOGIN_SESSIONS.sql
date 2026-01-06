-- ==========================================
-- FIX_LOGIN_SESSIONS.sql
-- ==========================================
-- SOLUSI: Hapus trigger pada tabel sesi login
-- Login gagal bukan hanya karena auth.users, tapi bisa karena 
-- insert ke auth.sessions atau auth.refresh_tokens gagal karena trigger.

BEGIN;

-- 1. HAPUS TRIGGER PADA AUTH.SESSIONS
-- Ini seringkali terlewat. Jika ada trigger yang mencoba mencatat sesi
-- ke tabel public tapi gagal permission, login akan error.
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_schema = 'auth' 
        AND event_object_table = 'sessions' 
    ) 
    LOOP 
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON auth.sessions CASCADE;'; 
        RAISE NOTICE 'Dropped session trigger: %', r.trigger_name;
    END LOOP; 
END $$;

-- 2. HAPUS TRIGGER PADA AUTH.REFRESH_TOKENS
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_schema = 'auth' 
        AND event_object_table = 'refresh_tokens' 
    ) 
    LOOP 
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON auth.refresh_tokens CASCADE;'; 
        RAISE NOTICE 'Dropped refresh_token trigger: %', r.trigger_name;
    END LOOP; 
END $$;

-- 3. HAPUS TRIGGER PADA AUTH.USERS (Ulangi untuk memastikan)
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_schema = 'auth' 
        AND event_object_table = 'users' 
    ) 
    LOOP 
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON auth.users CASCADE;'; 
        RAISE NOTICE 'Dropped user trigger: %', r.trigger_name;
    END LOOP; 
END $$;

COMMIT;

SELECT '✅ SESSION & TRIGGER CLEANUP COMPLETED.' as status;
