-- =====================================================
-- Migration: Support for Raport / Report Card Features
-- =====================================================

-- 1. Create Perilaku Semester Table
-- This table stores subjective behaviors and summary data per semester
CREATE TABLE IF NOT EXISTS perilaku_semester (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES semester(id) ON DELETE CASCADE,
    
    -- Perilaku Murid (Subjective Grades)
    ketekunan VARCHAR(50) DEFAULT 'Baik',
    kedisiplinan VARCHAR(50) DEFAULT 'Baik',
    kebersihan VARCHAR(50) DEFAULT 'Baik',
    kerapian VARCHAR(50) DEFAULT 'Baik',
    
    -- Pencapaian Tahfizh Summary
    jumlah_hafalan VARCHAR(100), -- e.g. "0 Juz", "1 Juz"
    predikat_hafalan VARCHAR(50), -- e.g. "Baik", "Mumtaz"
    total_hafalan VARCHAR(100), -- e.g. "30 Juz", "-"

    -- Presensi Summary (Manual Override)
    sakit INT DEFAULT 0,
    izin INT DEFAULT 0,
    alpha INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(santri_id, semester_id)
);

-- 2. Enable RLS
ALTER TABLE perilaku_semester ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Perilaku viewable by authenticated" ON perilaku_semester
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Perilaku editable by admin and guru" ON perilaku_semester
    FOR ALL USING (
        auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'guru', 'musyrif'))
    );

-- 4. Trigger for updated_at
DROP TRIGGER IF EXISTS update_perilaku_semester_updated_at ON perilaku_semester;
CREATE TRIGGER update_perilaku_semester_updated_at
    BEFORE UPDATE ON perilaku_semester
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Add comments
COMMENT ON TABLE perilaku_semester IS 'Stores subjective behavior grades and report summaries per semester';
