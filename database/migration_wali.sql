-- Migration: Portal Wali Santri
-- Tabel untuk fitur Pengumuman Publik, Pesan Wali

-- =============================================
-- 1. TABEL PENGUMUMAN PUBLIK (untuk Wali Santri)
-- =============================================
CREATE TABLE IF NOT EXISTS pengumuman (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    judul VARCHAR(255) NOT NULL,
    isi TEXT NOT NULL,
    kategori VARCHAR(50),
    tanggal_publish DATE DEFAULT CURRENT_DATE,
    tanggal_expired DATE,
    is_active BOOLEAN DEFAULT TRUE,
    is_pinned BOOLEAN DEFAULT FALSE,
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_pengumuman_active ON pengumuman(is_active, tanggal_publish);
CREATE INDEX IF NOT EXISTS idx_pengumuman_kategori ON pengumuman(kategori);

-- =============================================
-- 2. TABEL PESAN WALI (Komunikasi Pondok - Wali)
-- =============================================
CREATE TABLE IF NOT EXISTS pesan_wali (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wali_id UUID NOT NULL,
    santri_id UUID REFERENCES santri(id) ON DELETE CASCADE,
    pengirim VARCHAR(20) CHECK (pengirim IN ('WALI', 'PONDOK')) NOT NULL,
    isi TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pesan_wali_user ON pesan_wali(wali_id);
CREATE INDEX IF NOT EXISTS idx_pesan_wali_santri ON pesan_wali(santri_id);

-- =============================================
-- 3. ENABLE RLS
-- =============================================
ALTER TABLE pengumuman ENABLE ROW LEVEL SECURITY;
ALTER TABLE pesan_wali ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. DROP & CREATE RLS POLICIES
-- =============================================

-- Drop existing policies safely
DO $$ BEGIN
    DROP POLICY IF EXISTS "Pengumuman viewable by authenticated" ON pengumuman;
    DROP POLICY IF EXISTS "Pengumuman insertable by admin/pengurus" ON pengumuman;
    DROP POLICY IF EXISTS "Pengumuman updatable by admin/pengurus" ON pengumuman;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Pesan wali viewable by participants" ON pesan_wali;
    DROP POLICY IF EXISTS "Pesan wali insertable by participants" ON pesan_wali;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Create policies
CREATE POLICY "Pengumuman viewable by authenticated" ON pengumuman 
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Pengumuman insertable by admin/pengurus" ON pengumuman 
FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'pengurus'))
);

CREATE POLICY "Pengumuman updatable by admin/pengurus" ON pengumuman 
FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'pengurus'))
);

CREATE POLICY "Pesan wali viewable by participants" ON pesan_wali 
FOR SELECT USING (
    auth.uid() = wali_id 
    OR auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'pengurus'))
);

CREATE POLICY "Pesan wali insertable by participants" ON pesan_wali 
FOR INSERT WITH CHECK (
    auth.uid() = wali_id 
    OR auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'pengurus'))
);

-- =============================================
-- 5. TRIGGERS
-- =============================================
CREATE OR REPLACE FUNCTION update_pengumuman_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pengumuman_updated_at ON pengumuman;
CREATE TRIGGER trigger_pengumuman_updated_at
    BEFORE UPDATE ON pengumuman
    FOR EACH ROW
    EXECUTE FUNCTION update_pengumuman_updated_at();
