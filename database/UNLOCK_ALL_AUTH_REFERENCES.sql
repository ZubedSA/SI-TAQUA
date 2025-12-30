-- =====================================================
-- UNLOCK ALL AUTH REFERENCES (Sapu Jagat)
-- =====================================================
-- Masalah: Error 500 saat Delete User & Login.
-- Diagnosa: Ada tabel "Tersembunyi" yang mengunci auth.users
-- Solusi: Cari SEMUA tabel yang punya relasi ke auth.users, dan Longgarkan Kuncinya.

DO $$
DECLARE
    r RECORD;
    cmd TEXT;
BEGIN
    RAISE NOTICE 'MEMULAI PEMBUKAAN KUNCI RELASI AUTH...';

    -- 1. LOOP SEMUA FOREIGN KEY YANG MENGARAH KE auth.users
    FOR r IN (
        SELECT 
            tc.table_schema, 
            tc.table_name, 
            kcu.column_name, 
            tc.constraint_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
        WHERE 
            tc.constraint_type = 'FOREIGN KEY' 
            AND ccu.table_name = 'users' 
            AND ccu.table_schema = 'auth'
            AND tc.table_schema = 'public' -- Hanya proses schema public
    ) LOOP
        
        RAISE NOTICE '>> Mengubah Relasi: %.% (Kolom: %)', r.table_schema, r.table_name, r.column_name;

        -- A. Hapus Constraint Lama (Yang Kaku)
        cmd := 'ALTER TABLE ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name) || 
               ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name) || ';';
        EXECUTE cmd;

        -- B. Pasang Constraint Baru (Yang Fleksibel - CASCADE)
        -- Artinya: Jika User dihapus, data di tabel ini ikut terhapus (atau set null)
        -- Kita pakai CASCADE agar tidak ada Error 500 saat delete user.
        cmd := 'ALTER TABLE ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name) || 
               ' ADD CONSTRAINT ' || quote_ident(r.constraint_name) || 
               ' FOREIGN KEY (' || quote_ident(r.column_name) || ') ' ||
               ' REFERENCES auth.users(id) ON DELETE CASCADE;';
        EXECUTE cmd;

    END LOOP;

    RAISE NOTICE 'SELESAI. SEMUA KUNCI TELAH DIBUKA.';
END $$;

-- 2. KONFIRMASI: Pastikan tidak ada Trigger yang ketinggalan
DO $$ 
DECLARE r RECORD;
BEGIN 
    FOR r IN (SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE event_object_schema = 'auth' AND event_object_table = 'users') LOOP 
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON auth.users CASCADE;'; 
        RAISE NOTICE 'Deleted Trigger on auth.users: %', r.trigger_name;
    END LOOP; 
END $$;

-- 3. RELOAD
NOTIFY pgrst, 'reload schema';
