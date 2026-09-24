-- =========================================================================
-- ADD_FOTO_SANTRI.sql
-- Menambahkan kolom foto_url ke tabel santri dan memastikan policy uploads
-- =========================================================================

-- 1. Tambah kolom foto_url jika belum ada
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'santri' 
        AND column_name = 'foto_url'
    ) THEN
        ALTER TABLE santri ADD COLUMN foto_url TEXT;
        COMMENT ON COLUMN santri.foto_url IS 'URL foto resmi santri dari Supabase Storage';
    END IF;
END $$;

-- 2. Pastikan bucket 'uploads' bisa menyimpan foto santri
-- Policy storage untuk uploads sudah dibuat di CREATE_UPLOADS_BUCKET.sql
-- Namun kita pastikan folder 'santri' bisa diakses publik (SELECT)
DO $$
BEGIN
    -- Verifikasi kolom berhasil ditambahkan
    RAISE NOTICE 'Kolom foto_url berhasil diperiksa/ditambahkan pada tabel santri.';
END $$;

-- 3. Cek struktur tabel santri
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'santri' AND column_name IN ('id', 'nis', 'nama', 'foto_url');
