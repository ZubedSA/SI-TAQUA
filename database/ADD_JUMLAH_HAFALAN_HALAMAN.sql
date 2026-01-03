-- ============================================
-- MIGRATION: ADD jumlah_hafalan_halaman TO nilai
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'nilai' 
        AND column_name = 'jumlah_hafalan_halaman'
    ) THEN
        ALTER TABLE nilai ADD COLUMN jumlah_hafalan_halaman INTEGER DEFAULT 0;
    END IF;
END $$;

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'nilai' AND column_name = 'jumlah_hafalan_halaman';
