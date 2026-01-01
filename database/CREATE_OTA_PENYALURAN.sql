-- =====================================================
-- CREATE TABLE: ota_penyaluran
-- Untuk fitur penyaluran dana langsung ke santri
-- Jalankan di Supabase SQL Editor
-- =====================================================

-- Create table
CREATE TABLE IF NOT EXISTS ota_penyaluran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
    nominal NUMERIC(15, 2) NOT NULL CHECK (nominal > 0),
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    keterangan TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ota_penyaluran_santri ON ota_penyaluran(santri_id);
CREATE INDEX IF NOT EXISTS idx_ota_penyaluran_tanggal ON ota_penyaluran(tanggal);

-- Disable RLS untuk sekarang (simplify)
ALTER TABLE ota_penyaluran DISABLE ROW LEVEL SECURITY;

-- Reload schema
NOTIFY pgrst, 'reload schema';

-- Verify
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'ota_penyaluran'
ORDER BY ordinal_position;

SELECT '✅ Tabel ota_penyaluran berhasil dibuat!' as result;
