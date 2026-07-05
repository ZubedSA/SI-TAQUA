-- =====================================================
-- SCHEMA: Import Santri with Angkatan Support
-- Run this ONCE to setup the database properly
-- =====================================================

-- 1. Create Angkatan Table
CREATE TABLE IF NOT EXISTS angkatan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(100) UNIQUE NOT NULL,  -- "Angkatan 1", "Angkatan 2023", etc.
    tahun_masuk INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ensure santri has angkatan_id column
ALTER TABLE santri ADD COLUMN IF NOT EXISTS angkatan_id UUID REFERENCES angkatan(id) ON DELETE SET NULL;

-- 3. Enable RLS on angkatan
ALTER TABLE angkatan ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for angkatan
DROP POLICY IF EXISTS "Allow read for authenticated" ON angkatan;
CREATE POLICY "Allow read for authenticated" ON angkatan 
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow all for admin" ON angkatan;
CREATE POLICY "Allow all for admin" ON angkatan 
FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'guru', 'kepala_sekolah'))
);

-- 5. Grant permissions
GRANT ALL ON TABLE angkatan TO authenticated;
GRANT ALL ON TABLE angkatan TO service_role;

-- 6. Verification
SELECT 'Schema ready!' as status;
