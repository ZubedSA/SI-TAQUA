-- Migration: Create taujihad table
-- Taujihad berisi catatan/pesan untuk santri per semester

CREATE TABLE IF NOT EXISTS taujihad (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    santri_id UUID REFERENCES santri(id) ON DELETE CASCADE,
    semester_id UUID REFERENCES semester(id) ON DELETE CASCADE,
    catatan TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(santri_id, semester_id)
);

-- Enable RLS
ALTER TABLE taujihad ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all operations for authenticated users" ON taujihad
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Comment
COMMENT ON TABLE taujihad IS 'Catatan/pesan taujihad untuk santri per semester, terkoneksi ke raport';
