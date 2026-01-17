-- Migration: Jadwal & Presensi - SAFE VERSION
-- Menangani kasus dimana tabel/policy sudah ada

-- Drop existing policies first (if they exist)
DROP POLICY IF EXISTS "Jadwal viewable by everyone" ON jadwal_pelajaran;
DROP POLICY IF EXISTS "Jadwal editable by admin" ON jadwal_pelajaran;
DROP POLICY IF EXISTS "Presensi Mapel viewable by authenticated" ON presensi_mapel;
DROP POLICY IF EXISTS "Presensi Mapel insertable by guru/admin" ON presensi_mapel;
DROP POLICY IF EXISTS "Presensi Mapel editable by creator or admin" ON presensi_mapel;
DROP POLICY IF EXISTS "Presensi Detil viewable by authenticated" ON presensi_mapel_detil;
DROP POLICY IF EXISTS "Presensi Detil editable by guru/admin" ON presensi_mapel_detil;
DROP POLICY IF EXISTS "Presensi viewable by authenticated" ON presensi;
DROP POLICY IF EXISTS "Presensi insertable by guru/admin" ON presensi;
DROP POLICY IF EXISTS "Presensi updatable by guru/admin" ON presensi;
DROP POLICY IF EXISTS "Presensi deletable by admin" ON presensi;

-- =============================================
-- 1. TABEL JADWAL PELAJARAN
-- =============================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hari_enum') THEN
        CREATE TYPE hari_enum AS ENUM ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS jadwal_pelajaran (
  id uuid primary key default uuid_generate_v4(),
  kelas_id uuid references kelas(id) on delete cascade,
  mapel_id uuid references mapel(id) on delete restrict,
  guru_id uuid references guru(id) on delete set null,
  hari hari_enum not null,
  jam_ke int not null,
  jam_mulai time not null,
  jam_selesai time not null,
  tahun_ajaran VARCHAR(20) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_jadwal_kelas ON jadwal_pelajaran(kelas_id);
CREATE INDEX IF NOT EXISTS idx_jadwal_guru ON jadwal_pelajaran(guru_id);
CREATE INDEX IF NOT EXISTS idx_jadwal_hari ON jadwal_pelajaran(hari);

-- =============================================
-- 2. TABEL PRESENSI MAPEL (untuk Jurnal Guru)
-- =============================================
CREATE TABLE IF NOT EXISTS presensi_mapel (
  id uuid primary key default uuid_generate_v4(),
  jadwal_id uuid references jadwal_pelajaran(id),
  kelas_id uuid references kelas(id),
  guru_id uuid references guru(id),
  mapel_id uuid references mapel(id),
  tanggal date not null default current_date,
  materi text,
  catatan text,
  status text check (status in ('Terlaksana', 'Libur', 'Kosong')) default 'Terlaksana',
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_presensi_mapel_tanggal ON presensi_mapel(tanggal);
CREATE INDEX IF NOT EXISTS idx_presensi_mapel_guru ON presensi_mapel(guru_id);
CREATE INDEX IF NOT EXISTS idx_presensi_mapel_kelas ON presensi_mapel(kelas_id);

-- =============================================
-- 3. TABEL PRESENSI MAPEL DETIL
-- =============================================
CREATE TABLE IF NOT EXISTS presensi_mapel_detil (
  id uuid primary key default uuid_generate_v4(),
  presensi_mapel_id uuid references presensi_mapel(id) on delete cascade,
  santri_id uuid references santri(id),
  status text check (status in ('Hadir', 'Izin', 'Sakit', 'Alfa', 'Terlambat')) default 'Hadir',
  keterangan text,
  created_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_presensi_detil_header ON presensi_mapel_detil(presensi_mapel_id);
CREATE INDEX IF NOT EXISTS idx_presensi_detil_santri ON presensi_mapel_detil(santri_id);

-- =============================================
-- 4. TABEL PRESENSI HARIAN (untuk PresensiHarianPage)
-- =============================================
CREATE TABLE IF NOT EXISTS presensi (
  id uuid primary key default uuid_generate_v4(),
  santri_id uuid not null references santri(id) on delete cascade,
  tanggal date not null default current_date,
  status text check (status in ('hadir', 'sakit', 'izin', 'alpha')) default 'hadir',
  keterangan text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_presensi_santri_tanggal ON presensi(santri_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_presensi_tanggal ON presensi(tanggal);
CREATE INDEX IF NOT EXISTS idx_presensi_status ON presensi(status);

-- =============================================
-- 5. ENABLE RLS
-- =============================================
ALTER TABLE jadwal_pelajaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE presensi_mapel ENABLE ROW LEVEL SECURITY;
ALTER TABLE presensi_mapel_detil ENABLE ROW LEVEL SECURITY;
ALTER TABLE presensi ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 6. RLS POLICIES (Fresh Create after Drop)
-- =============================================

-- Jadwal
CREATE POLICY "Jadwal viewable by everyone" ON jadwal_pelajaran FOR SELECT USING (true);
CREATE POLICY "Jadwal editable by admin" ON jadwal_pelajaran FOR ALL USING (
  auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin')
);

-- Presensi Mapel
CREATE POLICY "Presensi Mapel viewable by authenticated" ON presensi_mapel FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Presensi Mapel insertable by guru/admin" ON presensi_mapel FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'guru'))
);
CREATE POLICY "Presensi Mapel editable by creator or admin" ON presensi_mapel FOR UPDATE USING (
  auth.uid() = created_by OR 
  auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin')
);

-- Presensi Mapel Detil
CREATE POLICY "Presensi Detil viewable by authenticated" ON presensi_mapel_detil FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Presensi Detil editable by guru/admin" ON presensi_mapel_detil FOR ALL USING (
  auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'guru'))
);

-- Presensi Harian
CREATE POLICY "Presensi viewable by authenticated" ON presensi FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Presensi insertable by guru/admin" ON presensi FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'guru', 'musyrif', 'pengasuh'))
);
CREATE POLICY "Presensi updatable by guru/admin" ON presensi FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'guru', 'musyrif', 'pengasuh'))
);
CREATE POLICY "Presensi deletable by admin" ON presensi FOR DELETE USING (
  auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin')
);

-- =============================================
-- 7. TRIGGERS
-- =============================================
CREATE OR REPLACE FUNCTION update_presensi_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_presensi_updated_at ON presensi;
CREATE TRIGGER trigger_presensi_updated_at
    BEFORE UPDATE ON presensi
    FOR EACH ROW
    EXECUTE FUNCTION update_presensi_updated_at();
