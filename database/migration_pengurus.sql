-- Migration: Modul Pengurus
-- Tabel untuk fitur Pelanggaran, Pengumuman, Santri Bermasalah, Buletin, Arsip

-- =============================================
-- 1. TABEL PELANGGARAN
-- =============================================
CREATE TABLE IF NOT EXISTS pelanggaran (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    jenis VARCHAR(200) NOT NULL,
    kategori VARCHAR(50),
    tingkat INT CHECK (tingkat BETWEEN 1 AND 4) DEFAULT 1,
    status VARCHAR(20) CHECK (status IN ('OPEN', 'PROSES', 'SELESAI')) DEFAULT 'OPEN',
    keterangan TEXT,
    tindakan TEXT,
    saksi TEXT[],
    penanganan_oleh UUID REFERENCES guru(id),
    tanggal_selesai DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_pelanggaran_santri ON pelanggaran(santri_id);
CREATE INDEX IF NOT EXISTS idx_pelanggaran_tanggal ON pelanggaran(tanggal);
CREATE INDEX IF NOT EXISTS idx_pelanggaran_status ON pelanggaran(status);
CREATE INDEX IF NOT EXISTS idx_pelanggaran_tingkat ON pelanggaran(tingkat);

-- =============================================
-- 2. TABEL PENGUMUMAN INTERNAL
-- =============================================
CREATE TABLE IF NOT EXISTS pengumuman_internal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    judul VARCHAR(255) NOT NULL,
    isi TEXT NOT NULL,
    kategori VARCHAR(50),
    prioritas INT DEFAULT 1,
    target_role TEXT[],
    mulai_tampil DATE NOT NULL DEFAULT CURRENT_DATE,
    selesai_tampil DATE,
    is_archived BOOLEAN DEFAULT FALSE,
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_pengumuman_internal_aktif ON pengumuman_internal(is_archived, mulai_tampil);

-- =============================================
-- 3. TABEL SANTRI BERMASALAH
-- =============================================
-- Drop view if exists (in case it was created as view before)
DROP VIEW IF EXISTS santri_bermasalah CASCADE;

CREATE TABLE IF NOT EXISTS santri_bermasalah (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
    kategori VARCHAR(50),
    tingkat_perhatian INT CHECK (tingkat_perhatian BETWEEN 1 AND 3) DEFAULT 1,
    deskripsi TEXT,
    tindak_lanjut TEXT,
    status VARCHAR(20) CHECK (status IN ('AKTIF', 'MONITORING', 'RESOLVED')) DEFAULT 'AKTIF',
    tanggal_mulai DATE DEFAULT CURRENT_DATE,
    tanggal_resolved DATE,
    penanggung_jawab UUID REFERENCES guru(id),
    catatan_progress TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_santri_bermasalah_santri ON santri_bermasalah(santri_id);
CREATE INDEX IF NOT EXISTS idx_santri_bermasalah_status ON santri_bermasalah(status);

-- =============================================
-- 4. TABEL BULETIN PONDOK
-- =============================================
CREATE TABLE IF NOT EXISTS buletin_pondok (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    judul VARCHAR(255) NOT NULL,
    edisi VARCHAR(50),
    bulan INT CHECK (bulan BETWEEN 1 AND 12),
    tahun INT,
    deskripsi TEXT,
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_buletin_bulan_tahun ON buletin_pondok(tahun, bulan);

-- =============================================
-- 5. TABEL ARSIP DOKUMEN
-- =============================================
CREATE TABLE IF NOT EXISTS arsip_dokumen (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL,
    kategori VARCHAR(50),
    deskripsi TEXT,
    file_url TEXT NOT NULL,
    file_type VARCHAR(20),
    file_size INT,
    tahun INT,
    is_public BOOLEAN DEFAULT FALSE,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_arsip_kategori ON arsip_dokumen(kategori);
CREATE INDEX IF NOT EXISTS idx_arsip_tahun ON arsip_dokumen(tahun);

-- =============================================
-- 6. ENABLE RLS
-- =============================================
ALTER TABLE pelanggaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengumuman_internal ENABLE ROW LEVEL SECURITY;
ALTER TABLE santri_bermasalah ENABLE ROW LEVEL SECURITY;
ALTER TABLE buletin_pondok ENABLE ROW LEVEL SECURITY;
ALTER TABLE arsip_dokumen ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 7. DROP EXISTING POLICIES (Safe - ignore errors)
-- =============================================
DO $$ BEGIN
    DROP POLICY IF EXISTS "Pelanggaran viewable by authenticated" ON pelanggaran;
    DROP POLICY IF EXISTS "Pelanggaran insertable by pengurus/admin" ON pelanggaran;
    DROP POLICY IF EXISTS "Pelanggaran updatable by pengurus/admin" ON pelanggaran;
    DROP POLICY IF EXISTS "Pelanggaran deletable by admin" ON pelanggaran;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Pengumuman internal viewable by authenticated" ON pengumuman_internal;
    DROP POLICY IF EXISTS "Pengumuman internal insertable by pengurus/admin" ON pengumuman_internal;
    DROP POLICY IF EXISTS "Pengumuman internal updatable by pengurus/admin" ON pengumuman_internal;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Santri bermasalah viewable by authenticated" ON santri_bermasalah;
    DROP POLICY IF EXISTS "Santri bermasalah insertable by pengurus/admin" ON santri_bermasalah;
    DROP POLICY IF EXISTS "Santri bermasalah updatable by pengurus/admin" ON santri_bermasalah;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Buletin viewable by authenticated" ON buletin_pondok;
    DROP POLICY IF EXISTS "Buletin insertable by pengurus/admin" ON buletin_pondok;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Arsip viewable by authenticated" ON arsip_dokumen;
    DROP POLICY IF EXISTS "Arsip insertable by pengurus/admin" ON arsip_dokumen;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =============================================
-- 8. RLS POLICIES
-- =============================================

-- Pelanggaran
CREATE POLICY "Pelanggaran viewable by authenticated" ON pelanggaran 
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Pelanggaran insertable by pengurus/admin" ON pelanggaran 
FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'pengurus'))
);

CREATE POLICY "Pelanggaran updatable by pengurus/admin" ON pelanggaran 
FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'pengurus'))
);

CREATE POLICY "Pelanggaran deletable by admin" ON pelanggaran 
FOR DELETE USING (
    auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin')
);

-- Pengumuman Internal
CREATE POLICY "Pengumuman internal viewable by authenticated" ON pengumuman_internal 
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Pengumuman internal insertable by pengurus/admin" ON pengumuman_internal 
FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'pengurus'))
);

CREATE POLICY "Pengumuman internal updatable by pengurus/admin" ON pengumuman_internal 
FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'pengurus'))
);

-- Santri Bermasalah
CREATE POLICY "Santri bermasalah viewable by authenticated" ON santri_bermasalah 
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Santri bermasalah insertable by pengurus/admin" ON santri_bermasalah 
FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'pengurus', 'guru'))
);

CREATE POLICY "Santri bermasalah updatable by pengurus/admin" ON santri_bermasalah 
FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'pengurus', 'guru'))
);

-- Buletin
CREATE POLICY "Buletin viewable by authenticated" ON buletin_pondok 
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Buletin insertable by pengurus/admin" ON buletin_pondok 
FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'pengurus'))
);

-- Arsip
CREATE POLICY "Arsip viewable by authenticated" ON arsip_dokumen 
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Arsip insertable by pengurus/admin" ON arsip_dokumen 
FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'pengurus'))
);

-- =============================================
-- 9. TRIGGERS
-- =============================================
CREATE OR REPLACE FUNCTION update_pengurus_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pelanggaran_updated_at ON pelanggaran;
CREATE TRIGGER trigger_pelanggaran_updated_at
    BEFORE UPDATE ON pelanggaran
    FOR EACH ROW
    EXECUTE FUNCTION update_pengurus_updated_at();

DROP TRIGGER IF EXISTS trigger_pengumuman_updated_at ON pengumuman_internal;
CREATE TRIGGER trigger_pengumuman_updated_at
    BEFORE UPDATE ON pengumuman_internal
    FOR EACH ROW
    EXECUTE FUNCTION update_pengurus_updated_at();

DROP TRIGGER IF EXISTS trigger_santri_bermasalah_updated_at ON santri_bermasalah;
CREATE TRIGGER trigger_santri_bermasalah_updated_at
    BEFORE UPDATE ON santri_bermasalah
    FOR EACH ROW
    EXECUTE FUNCTION update_pengurus_updated_at();
