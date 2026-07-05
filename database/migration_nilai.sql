-- Migration: Tabel Nilai - SAFE VERSION
-- Menangani kasus dimana tabel/policy sudah ada

-- Drop existing policies first (if they exist)
DROP POLICY IF EXISTS "Nilai viewable by authenticated" ON nilai;
DROP POLICY IF EXISTS "Nilai insertable by guru/admin" ON nilai;
DROP POLICY IF EXISTS "Nilai updatable by creator or admin" ON nilai;
DROP POLICY IF EXISTS "Nilai deletable by admin" ON nilai;

-- 1. Tabel Nilai
CREATE TABLE IF NOT EXISTS nilai (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES semester(id) ON DELETE RESTRICT,
    mapel_id UUID REFERENCES mapel(id) ON DELETE SET NULL,
    penguji_id UUID REFERENCES guru(id) ON DELETE SET NULL,
    jenis_ujian VARCHAR(20) NOT NULL DEFAULT 'harian',
    kategori VARCHAR(20) NOT NULL DEFAULT 'Madrosiyah',
    bulan INT,
    tahun INT,
    nilai_hafalan DECIMAL(5,2),
    nilai_murajaah DECIMAL(5,2),
    nilai_tajwid DECIMAL(5,2),
    nilai_kelancaran DECIMAL(5,2),
    jumlah_hafalan INT DEFAULT 0,
    jumlah_hafalan_halaman INT DEFAULT 0,
    nilai_akhir DECIMAL(5,2),
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- 2. Add missing columns if table already exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nilai' AND column_name = 'created_by') THEN
        ALTER TABLE nilai ADD COLUMN created_by UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nilai' AND column_name = 'updated_at') THEN
        ALTER TABLE nilai ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nilai' AND column_name = 'penguji_id') THEN
        ALTER TABLE nilai ADD COLUMN penguji_id UUID REFERENCES guru(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nilai' AND column_name = 'jumlah_hafalan') THEN
        ALTER TABLE nilai ADD COLUMN jumlah_hafalan INT DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nilai' AND column_name = 'jumlah_hafalan_halaman') THEN
        ALTER TABLE nilai ADD COLUMN jumlah_hafalan_halaman INT DEFAULT 0;
    END IF;
END $$;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_nilai_santri ON nilai(santri_id);
CREATE INDEX IF NOT EXISTS idx_nilai_semester ON nilai(semester_id);
CREATE INDEX IF NOT EXISTS idx_nilai_mapel ON nilai(mapel_id);
CREATE INDEX IF NOT EXISTS idx_nilai_jenis ON nilai(jenis_ujian);
CREATE INDEX IF NOT EXISTS idx_nilai_kategori ON nilai(kategori);
CREATE INDEX IF NOT EXISTS idx_nilai_bulan_tahun ON nilai(bulan, tahun);

-- 4. Enable RLS
ALTER TABLE nilai ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (Fresh Create after Drop)
CREATE POLICY "Nilai viewable by authenticated" ON nilai 
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Nilai insertable by guru/admin" ON nilai 
FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'guru', 'musyrif'))
);

CREATE POLICY "Nilai updatable by creator or admin" ON nilai 
FOR UPDATE USING (
    auth.uid() = created_by OR 
    auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin')
);

CREATE POLICY "Nilai deletable by admin" ON nilai 
FOR DELETE USING (
    auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin')
);

-- 6. Updated_at trigger
CREATE OR REPLACE FUNCTION update_nilai_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_nilai_updated_at ON nilai;
CREATE TRIGGER trigger_nilai_updated_at
    BEFORE UPDATE ON nilai
    FOR EACH ROW
    EXECUTE FUNCTION update_nilai_updated_at();
