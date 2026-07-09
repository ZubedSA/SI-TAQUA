-- =====================================================
-- MIGRATION: Fitur Izin Tidak Mengajar & Pergantian Jadwal
-- =====================================================

-- 1. Tabel Izin Guru (Izin Tidak Mengajar)
CREATE TABLE IF NOT EXISTS izin_guru (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guru_id UUID NOT NULL REFERENCES guru(id) ON DELETE CASCADE,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    jenis_izin VARCHAR(50) NOT NULL CHECK (jenis_izin IN ('Sakit', 'Izin', 'Dinas', 'Lainnya')),
    keterangan TEXT,
    status VARCHAR(20) DEFAULT 'Menunggu' CHECK (status IN ('Menunggu', 'Disetujui', 'Ditolak')),
    catatan_admin TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_izin_guru_guru ON izin_guru(guru_id);
CREATE INDEX IF NOT EXISTS idx_izin_guru_tanggal ON izin_guru(tanggal_mulai, tanggal_selesai);

-- 2. Tabel Pergantian Jadwal (Tukar Jam, Ganti Jam, Guru Pengganti)
CREATE TABLE IF NOT EXISTS pergantian_jadwal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jenis VARCHAR(50) NOT NULL CHECK (jenis IN ('Ganti Jam', 'Tukar Jam', 'Guru Pengganti')),
    guru_pemohon_id UUID NOT NULL REFERENCES guru(id) ON DELETE CASCADE,
    jadwal_asli_id UUID NOT NULL REFERENCES jadwal_pelajaran(id) ON DELETE CASCADE,
    tanggal_absen DATE NOT NULL,
    
    -- Untuk Tukar Jam (Jadwal yang ditukar)
    jadwal_tujuan_id UUID REFERENCES jadwal_pelajaran(id) ON DELETE CASCADE,
    
    -- Untuk Tukar Jam / Guru Pengganti
    guru_pengganti_id UUID REFERENCES guru(id) ON DELETE SET NULL,
    
    -- Untuk Ganti Jam (Dipindah ke tanggal & jam berapa)
    tanggal_pengganti DATE,
    jam_ke_pengganti INT,
    jam_mulai_pengganti TIME,
    jam_selesai_pengganti TIME,
    
    alasan TEXT,
    status VARCHAR(50) DEFAULT 'Menunggu' CHECK (status IN ('Menunggu', 'Menunggu Konfirmasi Rekan', 'Disetujui', 'Ditolak')),
    catatan_admin TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_pergantian_pemohon ON pergantian_jadwal(guru_pemohon_id);
CREATE INDEX IF NOT EXISTS idx_pergantian_jadwal_asli ON pergantian_jadwal(jadwal_asli_id);
CREATE INDEX IF NOT EXISTS idx_pergantian_tanggal_absen ON pergantian_jadwal(tanggal_absen);
CREATE INDEX IF NOT EXISTS idx_pergantian_pengganti ON pergantian_jadwal(guru_pengganti_id);

-- 3. Row Level Security
ALTER TABLE izin_guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE pergantian_jadwal ENABLE ROW LEVEL SECURITY;

-- Helper Functions (Bypass RLS on auth.users)
CREATE OR REPLACE FUNCTION is_guru_or_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' IN ('admin', 'guru', 'admin_absensi')
  );
$$;

CREATE OR REPLACE FUNCTION is_admin_absensi()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' IN ('admin', 'admin_absensi')
  );
$$;

-- Policy untuk Izin Guru
DROP POLICY IF EXISTS "Izin Guru viewable by authenticated" ON izin_guru;
CREATE POLICY "Izin Guru viewable by authenticated" ON izin_guru FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Izin Guru insertable by guru/admin" ON izin_guru;
CREATE POLICY "Izin Guru insertable by guru/admin" ON izin_guru FOR INSERT WITH CHECK (
  is_guru_or_admin()
);

DROP POLICY IF EXISTS "Izin Guru updatable by creator or admin" ON izin_guru;
CREATE POLICY "Izin Guru updatable by creator or admin" ON izin_guru FOR UPDATE USING (
  created_by = auth.uid() OR is_admin_absensi()
);

-- Policy untuk Pergantian Jadwal
DROP POLICY IF EXISTS "Pergantian Jadwal viewable by authenticated" ON pergantian_jadwal;
CREATE POLICY "Pergantian Jadwal viewable by authenticated" ON pergantian_jadwal FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Pergantian Jadwal insertable by guru/admin" ON pergantian_jadwal;
CREATE POLICY "Pergantian Jadwal insertable by guru/admin" ON pergantian_jadwal FOR INSERT WITH CHECK (
  is_guru_or_admin()
);

DROP POLICY IF EXISTS "Pergantian Jadwal updatable by creator, rekan, or admin" ON pergantian_jadwal;
CREATE POLICY "Pergantian Jadwal updatable by creator, rekan, or admin" ON pergantian_jadwal FOR UPDATE USING (
  created_by = auth.uid() OR is_admin_absensi()
);

-- 4. Triggers for updated_at
DROP TRIGGER IF EXISTS update_izin_guru_updated_at ON izin_guru;
CREATE TRIGGER update_izin_guru_updated_at 
BEFORE UPDATE ON izin_guru 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pergantian_jadwal_updated_at ON pergantian_jadwal;
CREATE TRIGGER update_pergantian_jadwal_updated_at 
BEFORE UPDATE ON pergantian_jadwal 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
