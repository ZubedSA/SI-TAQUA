-- =============================================================================
-- COMPLETE DEV SCHEMA FOR SI-TAQUA (REORDERED & CLEANED)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hari_enum') THEN
        CREATE TYPE hari_enum AS ENUM ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad');
    END IF;
END $$;
    

SET session_replication_role = 'replica';

-- =============================================================================
-- BAGIAN 1: SEMUA PEMBUATAN TABEL (CREATE TABLE)
-- =============================================================================

CREATE TABLE IF NOT EXISTS guru (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nip VARCHAR(50) UNIQUE NOT NULL,
    nama VARCHAR(255) NOT NULL,
    jenis_kelamin VARCHAR(20) NOT NULL CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
    tempat_lahir VARCHAR(100),
    tanggal_lahir DATE,
    alamat TEXT,
    no_telp VARCHAR(20),
    email VARCHAR(255),
    jabatan VARCHAR(100) DEFAULT 'Pengajar',
    pendidikan_terakhir VARCHAR(50),
    status VARCHAR(20) DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Tidak Aktif', 'Cuti')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kelas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(50) NOT NULL,
    tingkat INTEGER NOT NULL CHECK (tingkat BETWEEN 1 AND 12),
    wali_kelas_id UUID REFERENCES guru(id) ON DELETE SET NULL,
    tahun_ajaran VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS halaqoh (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(100) NOT NULL,
    musyrif_id UUID REFERENCES guru(id) ON DELETE SET NULL,
    waktu VARCHAR(100),
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS santri (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nis VARCHAR(50) UNIQUE NOT NULL,
    nama VARCHAR(255) NOT NULL,
    jenis_kelamin VARCHAR(20) NOT NULL CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
    tempat_lahir VARCHAR(100),
    tanggal_lahir DATE,
    alamat TEXT,
    no_telp VARCHAR(20),
    nama_wali VARCHAR(255),
    no_telp_wali VARCHAR(20),
    kelas_id UUID REFERENCES kelas(id) ON DELETE SET NULL,
    halaqoh_id UUID REFERENCES halaqoh(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Tidak Aktif', 'Lulus', 'Pindah')),
    foto_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mapel (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode VARCHAR(20) UNIQUE NOT NULL,
    nama VARCHAR(100) NOT NULL,
    deskripsi TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hafalan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
    juz INTEGER NOT NULL CHECK (juz BETWEEN 1 AND 30),
    surah VARCHAR(100) NOT NULL,
    ayat_mulai INTEGER,
    ayat_selesai INTEGER,
    status VARCHAR(20) DEFAULT 'Proses' CHECK (status IN ('Belum', 'Proses', 'Mutqin')),
    tanggal DATE NOT NULL,
    catatan TEXT,
    penguji_id UUID REFERENCES guru(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS presensi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('hadir', 'izin', 'sakit', 'alpha')),
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(santri_id, tanggal)
);

CREATE TABLE IF NOT EXISTS nilai (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
    mapel_id UUID NOT NULL REFERENCES mapel(id) ON DELETE CASCADE,
    nilai_tugas DECIMAL(5,2),
    nilai_uts DECIMAL(5,2),
    nilai_uas DECIMAL(5,2),
    nilai_akhir DECIMAL(5,2),
    semester VARCHAR(10) NOT NULL CHECK (semester IN ('Ganjil', 'Genap')),
    tahun_ajaran VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(santri_id, mapel_id, semester, tahun_ajaran)
);

CREATE TABLE IF NOT EXISTS semester (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(50) NOT NULL,
    tahun_ajaran VARCHAR(20) NOT NULL,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS angkatan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(100) UNIQUE NOT NULL,  -- "Angkatan 1", "Angkatan 2023", etc.
    tahun_masuk INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_name VARCHAR(255) DEFAULT 'PTQ Al-Usymuni Batuan',
    school_year VARCHAR(20) DEFAULT '2024/2025',
    school_address TEXT DEFAULT 'Batuan, Sumenep, Madura',
    school_phone VARCHAR(50),
    school_email VARCHAR(100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS kategori_pembayaran (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    keterangan TEXT,
    nominal_default DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tagihan_santri (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    santri_id UUID REFERENCES santri(id) ON DELETE CASCADE,
    kategori_id UUID REFERENCES kategori_pembayaran(id) ON DELETE SET NULL,
    jumlah DECIMAL(15,2) NOT NULL,
    jatuh_tempo DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Belum Lunas' CHECK (status IN ('Belum Lunas', 'Sebagian', 'Lunas')),
    keterangan TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pembayaran_santri (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tagihan_id UUID REFERENCES tagihan_santri(id) ON DELETE CASCADE,
    santri_id UUID REFERENCES santri(id) ON DELETE CASCADE,
    jumlah DECIMAL(15,2) NOT NULL,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    metode VARCHAR(50) DEFAULT 'Tunai' CHECK (metode IN ('Tunai', 'Transfer', 'QRIS', 'Lainnya')),
    bukti_url TEXT,
    keterangan TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kas_pemasukan (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    sumber VARCHAR(200) NOT NULL,
    kategori VARCHAR(100),
    jumlah DECIMAL(15,2) NOT NULL,
    keterangan TEXT,
    bukti_url TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kas_pengeluaran (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    keperluan VARCHAR(200) NOT NULL,
    kategori VARCHAR(100),
    jumlah DECIMAL(15,2) NOT NULL,
    keterangan TEXT,
    bukti_url TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS anggaran (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama_program VARCHAR(200) NOT NULL,
    deskripsi TEXT,
    jumlah_diajukan DECIMAL(15,2) NOT NULL,
    jumlah_disetujui DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Disetujui', 'Ditolak', 'Selesai')),
    tanggal_pengajuan DATE DEFAULT CURRENT_DATE,
    tanggal_persetujuan DATE,
    disetujui_oleh UUID REFERENCES auth.users(id),
    catatan_persetujuan TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS realisasi_dana (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    anggaran_id UUID REFERENCES anggaran(id) ON DELETE CASCADE,
    jumlah_terpakai DECIMAL(15,2) NOT NULL,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    keperluan VARCHAR(200),
    keterangan TEXT,
    bukti_url TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    no_telp VARCHAR(20),
    nama VARCHAR(255),
    role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin', 'guru', 'wali')),
    santri_id UUID REFERENCES santri(id),
    guru_id UUID REFERENCES guru(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS wali_santri_link (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wali_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
    hubungan VARCHAR(50) DEFAULT 'Wali' CHECK (hubungan IN ('Ayah', 'Ibu', 'Wali', 'Kakek', 'Nenek', 'Lainnya')),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(wali_user_id, santri_id)
);

CREATE TABLE IF NOT EXISTS pelanggaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    tingkat INTEGER NOT NULL CHECK (tingkat BETWEEN 1 AND 4),
    -- Tingkat: 1=Ringan, 2=Sedang, 3=Berat, 4=Sangat Berat
    jenis VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    lokasi VARCHAR(255),
    saksi TEXT,
    pelapor_id UUID REFERENCES user_profiles(id),
    status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PROSES', 'SELESAI')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tindak_lanjut_pelanggaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pelanggaran_id UUID NOT NULL REFERENCES pelanggaran(id) ON DELETE CASCADE,
    jenis_tindakan VARCHAR(100) NOT NULL,
    -- Contoh: 'Teguran Lisan', 'Peringatan Tertulis', 'Panggilan Wali', 'Skorsing', dll
    deskripsi TEXT,
    penanggung_jawab_id UUID REFERENCES user_profiles(id),
    tanggal_tindakan DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SELESAI')),
    catatan_private TEXT, -- Catatan internal pengurus, tidak ditampilkan ke wali
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pengumuman_internal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judul VARCHAR(255) NOT NULL,
    isi TEXT NOT NULL,
    kategori VARCHAR(50) DEFAULT 'UMUM' CHECK (kategori IN ('UMUM', 'PENTING', 'MENDESAK', 'INFO')),
    prioritas INTEGER DEFAULT 0, -- Makin tinggi makin atas
    mulai_tampil DATE DEFAULT CURRENT_DATE,
    selesai_tampil DATE,
    is_archived BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS informasi_pondok (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judul VARCHAR(255) NOT NULL,
    isi TEXT NOT NULL,
    kategori VARCHAR(50) DEFAULT 'INFO' CHECK (kategori IN ('INFO', 'PERATURAN', 'JADWAL', 'KONTAK', 'FASILITAS')),
    urutan INTEGER DEFAULT 0, -- Untuk sorting tampilan
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS buletin_pondok (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judul VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    file_url TEXT, -- URL ke file di storage
    file_type VARCHAR(50), -- 'PDF', 'IMAGE', dll
    bulan INTEGER NOT NULL CHECK (bulan BETWEEN 1 AND 12),
    tahun INTEGER NOT NULL,
    is_archived BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS catatan_pembinaan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
    pengurus_id UUID REFERENCES user_profiles(id),
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    jenis VARCHAR(50) DEFAULT 'UMUM' CHECK (jenis IN ('UMUM', 'KONSELING', 'PEMBINAAN', 'PUJIAN', 'CATATAN')),
    isi TEXT NOT NULL,
    is_private BOOLEAN DEFAULT TRUE, -- Private = hanya pengurus yang bisa lihat
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Pastikan user_1 < user_2 untuk konsistensi (avoid duplicate)
    CONSTRAINT unique_conversation UNIQUE (user_1_id, user_2_id),
    CONSTRAINT different_users CHECK (user_1_id != user_2_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'text' CHECK (type IN ('text', 'system')),
    is_read BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS presensi_mapel_detil (
  id uuid primary key default uuid_generate_v4(),
  presensi_mapel_id uuid references presensi_mapel(id) on delete cascade,
  santri_id uuid references santri(id),
  status text check (status in ('Hadir', 'Izin', 'Sakit', 'Alfa', 'Terlambat')) default 'Hadir',
  keterangan text,
  created_at timestamptz default now()
);

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

CREATE TABLE IF NOT EXISTS orang_tua_asuh (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  nama VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  no_hp VARCHAR(20),
  status BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ota_santri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ota_id UUID NOT NULL REFERENCES orang_tua_asuh(id) ON DELETE CASCADE,
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE (ota_id, santri_id)
);

CREATE TABLE IF NOT EXISTS ota_pemasukan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ota_id UUID REFERENCES orang_tua_asuh(id) ON DELETE SET NULL,
  jumlah NUMERIC(15, 2) NOT NULL, -- Added precision for currency
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  keterangan TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ota_pengeluaran (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ota_id UUID REFERENCES orang_tua_asuh(id) ON DELETE SET NULL,
  santri_id UUID REFERENCES santri(id) ON DELETE SET NULL,
  jumlah NUMERIC(15, 2) NOT NULL,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  keterangan TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Create Tables (IF NOT EXISTS - safe)
-- =====================================================

-- Table 1: santri_penerima_ota
CREATE TABLE IF NOT EXISTS santri_penerima_ota (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
    tanggal_mulai DATE NOT NULL DEFAULT CURRENT_DATE,
    tanggal_selesai DATE,
    keterangan TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    UNIQUE(santri_id)
);

CREATE TABLE IF NOT EXISTS ota_pool_dana (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bulan INTEGER NOT NULL CHECK (bulan >= 1 AND bulan <= 12),
    tahun INTEGER NOT NULL CHECK (tahun >= 2020 AND tahun <= 2100),
    total_pemasukan NUMERIC(15,2) DEFAULT 0,
    total_tersalurkan NUMERIC(15,2) DEFAULT 0,
    sisa_saldo NUMERIC(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'dikunci')),
    catatan TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(bulan, tahun)
);

CREATE TABLE IF NOT EXISTS ota_penyaluran_detail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL REFERENCES ota_pool_dana(id) ON DELETE CASCADE,
    santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
    nominal NUMERIC(15,2) NOT NULL CHECK (nominal > 0),
    keterangan TEXT,
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE(pool_id, santri_id)
);

CREATE TABLE IF NOT EXISTS ota_kategori (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama VARCHAR(100) NOT NULL,
  keterangan TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- =============================================================================

-- =====================================================
-- TABEL TAMBAHAN YANG DIPERLUKAN
-- =====================================================

-- 1. BUKTI TRANSFER
CREATE TABLE IF NOT EXISTS public.bukti_transfer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tagihan_id UUID REFERENCES tagihan_santri(id) ON DELETE SET NULL,
    santri_id UUID REFERENCES santri(id) ON DELETE CASCADE,
    wali_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    jumlah DECIMAL(15, 2) NOT NULL,
    tanggal_transfer DATE NOT NULL,
    bukti_url TEXT NOT NULL,
    catatan TEXT,
    status TEXT DEFAULT 'Menunggu' CHECK (status IN ('Menunggu', 'Diverifikasi', 'Ditolak')),
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. PRESENSI STAF
CREATE TABLE IF NOT EXISTS public.presensi_staf (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staf_id UUID REFERENCES public.guru(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    tipe TEXT NOT NULL,
    referensi_id UUID,
    waktu_scan TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PERILAKU SEMESTER (RAPORT)
CREATE TABLE IF NOT EXISTS perilaku_semester (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES semester(id) ON DELETE CASCADE,
    ketekunan VARCHAR(50) DEFAULT 'Baik',
    kedisiplinan VARCHAR(50) DEFAULT 'Baik',
    kebersihan VARCHAR(50) DEFAULT 'Baik',
    kerapian VARCHAR(50) DEFAULT 'Baik',
    jumlah_hafalan VARCHAR(100),
    predikat_hafalan VARCHAR(50),
    total_hafalan VARCHAR(100),
    sakit INT DEFAULT 0,
    izin INT DEFAULT 0,
    alpha INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(santri_id, semester_id)
);

-- 4. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
    user_id UUID DEFAULT auth.uid(),
    action TEXT NOT NULL,
    module TEXT,
    target_table TEXT, 
    record_id TEXT,
    old_data JSONB,
    new_data JSONB,
    meta_data JSONB,
    severity TEXT DEFAULT 'INFO'
);

-- 5. TRASH (SAMPAH)
CREATE TABLE IF NOT EXISTS trash (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    original_id UUID NOT NULL,
    data JSONB NOT NULL,
    deleted_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    auto_delete_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- 6. PENCAPAIAN HAFALAN
CREATE TABLE IF NOT EXISTS pencapaian_hafalan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    santri_id UUID REFERENCES santri(id) ON DELETE CASCADE,
    semester_id UUID REFERENCES semester(id) ON DELETE SET NULL,
    kategori VARCHAR(20) DEFAULT 'semester',
    periode VARCHAR(100),
    tanggal_dari DATE,
    tanggal_sampai DATE,
    bulan VARCHAR(2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================

-- =====================================================
-- TABEL TAMBAHAN YANG SEBELUMNYA BELUM ADA
-- =====================================================

-- 1. KALENDER AKADEMIK
CREATE TABLE IF NOT EXISTS kalender_akademik (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  judul VARCHAR(255) NOT NULL,
  deskripsi TEXT,
  tanggal_mulai DATE NOT NULL,
  tanggal_selesai DATE NOT NULL,
  jenis VARCHAR(50) NOT NULL,
  warna VARCHAR(20) DEFAULT 'blue',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. IZIN GURU
CREATE TABLE IF NOT EXISTS izin_guru (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guru_id UUID NOT NULL REFERENCES guru(id) ON DELETE CASCADE,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    jenis_izin VARCHAR(50) NOT NULL,
    keterangan TEXT,
    status VARCHAR(20) DEFAULT 'Menunggu',
    catatan_admin TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PERGANTIAN JADWAL
CREATE TABLE IF NOT EXISTS pergantian_jadwal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jenis VARCHAR(50) NOT NULL,
    guru_pemohon_id UUID NOT NULL REFERENCES guru(id) ON DELETE CASCADE,
    jadwal_asli_id UUID NOT NULL REFERENCES jadwal_pelajaran(id) ON DELETE CASCADE,
    tanggal_absen DATE NOT NULL,
    jadwal_tujuan_id UUID REFERENCES jadwal_pelajaran(id) ON DELETE CASCADE,
    guru_pengganti_id UUID REFERENCES guru(id) ON DELETE SET NULL,
    keterangan TEXT,
    status VARCHAR(20) DEFAULT 'Menunggu',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. OTA PENYALURAN
CREATE TABLE IF NOT EXISTS ota_penyaluran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
    nominal NUMERIC(15, 2) NOT NULL CHECK (nominal > 0),
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    keterangan TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- 5. TAUJIHAD
CREATE TABLE IF NOT EXISTS taujihad (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    santri_id UUID REFERENCES santri(id) ON DELETE CASCADE,
    semester_id UUID REFERENCES semester(id) ON DELETE CASCADE,
    catatan TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(santri_id, semester_id)
);

-- 6. MUSYRIF HALAQOH
CREATE TABLE IF NOT EXISTS musyrif_halaqoh (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    halaqoh_id UUID NOT NULL REFERENCES halaqoh(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, halaqoh_id)
);


-- BAGIAN 2: SEMUA PENAMBAHAN KOLOM (ALTER TABLE ADD COLUMN)
-- =============================================================================

ALTER TABLE santri ADD COLUMN IF NOT EXISTS angkatan_id UUID REFERENCES angkatan(id) ON DELETE SET NULL;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS no_telp VARCHAR(20);

ALTER TABLE orang_tua_asuh ADD COLUMN IF NOT EXISTS alamat TEXT;

ALTER TABLE orang_tua_asuh ADD COLUMN IF NOT EXISTS kategori_id UUID REFERENCES ota_kategori(id) ON DELETE SET NULL;

ALTER TABLE ota_pemasukan ADD COLUMN IF NOT EXISTS metode VARCHAR(50) DEFAULT 'Transfer';

ALTER TABLE guru ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.presensi_staf ADD COLUMN IF NOT EXISTS jam_ke INT;

ALTER TABLE public.presensi_staf ADD COLUMN IF NOT EXISTS jadwal_id UUID REFERENCES public.jadwal_pelajaran(id) ON DELETE CASCADE;

ALTER TABLE santri ADD COLUMN IF NOT EXISTS foto_url TEXT;

ALTER TABLE pelanggaran ADD COLUMN IF NOT EXISTS poin INTEGER DEFAULT 0;

ALTER TABLE nilai ADD COLUMN IF NOT EXISTS jumlah_hafalan_halaman INTEGER DEFAULT 0;

ALTER TABLE hafalan ADD COLUMN IF NOT EXISTS jenis VARCHAR(20) DEFAULT 'Setoran';

ALTER TABLE hafalan ADD COLUMN IF NOT EXISTS penguji_id UUID REFERENCES guru(id);

ALTER TABLE mapel ADD COLUMN IF NOT EXISTS kategori VARCHAR(20) DEFAULT 'Madrosiyah';

-- PENYESUAIAN KOLOM TAMBAHAN DARI SELURUH FILE MIGRASI
-- =============================================================================

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_url TEXT, ADD COLUMN IF NOT EXISTS file_name TEXT, ADD COLUMN IF NOT EXISTS file_type TEXT, ADD COLUMN IF NOT EXISTS file_size INTEGER;

ALTER TABLE kategori_pembayaran ADD COLUMN IF NOT EXISTS tipe VARCHAR(20) DEFAULT 'pembayaran' CHECK (tipe IN ('pemasukan', 'pengeluaran', 'pembayaran'));

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS password_ref VARCHAR(255);

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS no_telp VARCHAR(20);

ALTER TABLE perilaku_semester ADD COLUMN IF NOT EXISTS pulang INT DEFAULT 0;

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'DB';

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS action TEXT;

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS table_name TEXT;

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS record_id TEXT;

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS old_data JSONB;

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS new_data JSONB;

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS meta_data JSONB;

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS module TEXT;

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS target_table TEXT;

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS action_source TEXT;

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_role TEXT;

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS request_method TEXT;

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'SUCCESS';

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS action_source TEXT DEFAULT 'SYSTEM';

ALTER TABLE santri ADD COLUMN IF NOT EXISTS wali_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS active_role VARCHAR(50);

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS roles TEXT[];

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT ARRAY['guest'];

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS active_role TEXT DEFAULT 'guest';

ALTER TABLE trash ADD COLUMN IF NOT EXISTS reason TEXT;

ALTER TABLE public.pelanggaran ADD COLUMN IF NOT EXISTS sanksi TEXT;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT ARRAY['admin']::TEXT[];

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS active_role TEXT DEFAULT 'admin';

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS username TEXT;

ALTER TABLE public.presensi ADD COLUMN IF NOT EXISTS jam_ke INT DEFAULT 1;

ALTER TABLE hafalan ADD COLUMN IF NOT EXISTS juz_mulai INTEGER DEFAULT 30;

ALTER TABLE hafalan ADD COLUMN IF NOT EXISTS surah_mulai TEXT;

ALTER TABLE hafalan ADD COLUMN IF NOT EXISTS juz_selesai INTEGER DEFAULT 30;

ALTER TABLE hafalan ADD COLUMN IF NOT EXISTS surah_selesai TEXT;

ALTER TABLE hafalan ADD COLUMN IF NOT EXISTS kadar_setoran VARCHAR(50) DEFAULT '1 Halaman';

ALTER TABLE nilai ADD COLUMN IF NOT EXISTS created_by UUID;

ALTER TABLE nilai ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE nilai ADD COLUMN IF NOT EXISTS penguji_id UUID REFERENCES guru(id) ON DELETE SET NULL;

ALTER TABLE nilai ADD COLUMN IF NOT EXISTS jumlah_hafalan INT DEFAULT 0;

ALTER TABLE nilai ADD COLUMN IF NOT EXISTS jumlah_hafalan_halaman INT DEFAULT 0;

ALTER TABLE nilai ADD COLUMN IF NOT EXISTS semester_id UUID REFERENCES semester(id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS jenis_ujian VARCHAR(50) DEFAULT 'semester' CHECK (jenis_ujian IN ('syahri', 'semester', 'harian', 'uts', 'uas')), ADD COLUMN IF NOT EXISTS kategori VARCHAR(50) DEFAULT 'Madrosiyah' CHECK (kategori IN ('Tahfizhiyah', 'Madrosiyah')), ADD COLUMN IF NOT EXISTS bulan INTEGER CHECK (bulan BETWEEN 1 AND 12), ADD COLUMN IF NOT EXISTS tahun INTEGER, ADD COLUMN IF NOT EXISTS tanggal DATE, ADD COLUMN IF NOT EXISTS nilai_hafalan DECIMAL(5,2), ADD COLUMN IF NOT EXISTS nilai_tajwid DECIMAL(5,2), ADD COLUMN IF NOT EXISTS nilai_kelancaran DECIMAL(5,2), ADD COLUMN IF NOT EXISTS nilai_murajaah DECIMAL(5,2), ADD COLUMN IF NOT EXISTS catatan TEXT;

ALTER TABLE nilai ADD COLUMN IF NOT EXISTS nilai_harian DECIMAL(5,2), ADD COLUMN IF NOT EXISTS nilai_ujian DECIMAL(5,2), ADD COLUMN IF NOT EXISTS nilai_raport DECIMAL(5,2);

ALTER TABLE pencapaian_hafalan ADD COLUMN IF NOT EXISTS kategori VARCHAR(20) DEFAULT 'semester';

ALTER TABLE pencapaian_hafalan ADD COLUMN IF NOT EXISTS periode VARCHAR(100);

ALTER TABLE pencapaian_hafalan ADD COLUMN IF NOT EXISTS tanggal_dari DATE;

ALTER TABLE pencapaian_hafalan ADD COLUMN IF NOT EXISTS tanggal_sampai DATE;

ALTER TABLE pencapaian_hafalan ADD COLUMN IF NOT EXISTS bulan VARCHAR(2);

ALTER TABLE nilai ADD COLUMN IF NOT EXISTS jumlah_hafalan INTEGER DEFAULT 0;

ALTER TABLE nilai ADD COLUMN IF NOT EXISTS penguji_id UUID REFERENCES guru(id);

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS username VARCHAR(100);

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{}'::TEXT[];

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE jadwal_pelajaran ADD COLUMN IF NOT EXISTS tipe VARCHAR(20) DEFAULT 'MADROSAH', ADD COLUMN IF NOT EXISTS halaqoh_id UUID REFERENCES halaqoh(id) ON DELETE CASCADE;

ALTER TABLE presensi_mapel ADD COLUMN IF NOT EXISTS halaqoh_id UUID REFERENCES halaqoh(id) ON DELETE CASCADE;

-- =============================================================================

-- =====================================================
-- KOLOM TAMBAHAN YANG ADA DI DATABASE PRODUCTION
-- =====================================================

ALTER TABLE santri ADD COLUMN IF NOT EXISTS angkatan VARCHAR(50);

ALTER TABLE presensi ADD COLUMN IF NOT EXISTS nama_pengabsen VARCHAR(255);

ALTER TABLE perilaku_semester ADD COLUMN IF NOT EXISTS alpha_kelaas INT DEFAULT 0;

ALTER TABLE ota_pemasukan ADD COLUMN IF NOT EXISTS nama_donatur VARCHAR(255);

ALTER TABLE ota_pengeluaran ADD COLUMN IF NOT EXISTS keperluan TEXT;

-- Hapus check constraint role agar menerima semua role production
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;


-- BAGIAN 3: CONSTRAINT & LAIN-LAIN
-- =============================================================================

ALTER TABLE santri 
ADD COLUMN IF NOT EXISTS wali_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('admin', 'guru', 'wali', 'bendahara', 'pengasuh', 'pengurus'));

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_type TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER;

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check;

ALTER TABLE messages ADD CONSTRAINT messages_type_check 
    CHECK (type IN ('text', 'system', 'file', 'image'));

ALTER TABLE kategori_pembayaran 
ADD COLUMN IF NOT EXISTS tipe VARCHAR(20) DEFAULT 'pembayaran' 
CHECK (tipe IN ('pemasukan', 'pengeluaran', 'pembayaran'));

ALTER TABLE perilaku_semester 
ADD COLUMN IF NOT EXISTS pulang INT DEFAULT 0;

-- =============================================================================
-- =============================================================================

-- =====================================================
-- PERBAIKAN AKHIR UNTUK SINKRONISASI DATA PRODUCTION
-- =====================================================

-- 1. Kosongkan mapel awal di dev agar tidak bentrok unik (mapel_kode_key) dengan data aktif
TRUNCATE TABLE mapel CASCADE;

-- 2. Hapus batasan NOT NULL dan CHECK pada semester di tabel nilai
ALTER TABLE nilai ALTER COLUMN semester DROP NOT NULL;
ALTER TABLE nilai DROP CONSTRAINT IF EXISTS nilai_semester_check;

-- 3. Hapus batasan check pada status presensi & role user_profiles
ALTER TABLE presensi DROP CONSTRAINT IF EXISTS presensi_status_check;
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- 4. Pastikan kolom-kolom produksi yang sempat hilang tersedia
ALTER TABLE santri ADD COLUMN IF NOT EXISTS angkatan VARCHAR(50);
ALTER TABLE presensi ADD COLUMN IF NOT EXISTS nama_pengabsen VARCHAR(255);
ALTER TABLE perilaku_semester ADD COLUMN IF NOT EXISTS alpha_kelaas INT DEFAULT 0;
ALTER TABLE ota_pemasukan ADD COLUMN IF NOT EXISTS nama_donatur VARCHAR(255);
ALTER TABLE ota_pengeluaran ADD COLUMN IF NOT EXISTS keperluan TEXT;


-- =============================================================================
-- QUICK FIX DEV: HANYA PERBAIKAN AKHIR (CUKUP JALANKAN FILE INI DI DEV)
-- =============================================================================

-- 1. Lepas batasan status santri (agar menerima status 'Alumni', 'Boyong', huruf kecil, dll)
ALTER TABLE santri DROP CONSTRAINT IF EXISTS santri_status_check;

-- 2. Lepas batasan unik presensi (karena di production 1 santri bisa absen >1 kali sehari)
ALTER TABLE presensi DROP CONSTRAINT IF EXISTS presensi_santri_id_tanggal_key;
ALTER TABLE presensi DROP CONSTRAINT IF EXISTS presensi_santri_id_tanggal_status_key;

-- 3. Lepas NOT NULL mapel_id di tabel nilai
ALTER TABLE nilai ALTER COLUMN mapel_id DROP NOT NULL;

-- 4. Tambah kolom-kolom spesifik production yang tersisa
ALTER TABLE perilaku_semester ADD COLUMN IF NOT EXISTS alpha_kelaas INT DEFAULT 0;
ALTER TABLE izin_guru ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE pergantian_jadwal ADD COLUMN IF NOT EXISTS alasan TEXT;
ALTER TABLE ota_pemasukan ADD COLUMN IF NOT EXISTS sumber VARCHAR(200);
ALTER TABLE taujihad ADD COLUMN IF NOT EXISTS catatan_wali TEXT;

-- 5. Beritahu Supabase untuk reload schema cache
NOTIFY pgrst, 'reload schema';


-- BAGIAN 4: PENYELESAIAN
-- =============================================================================

SET session_replication_role = 'origin';
