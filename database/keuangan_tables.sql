-- ================================================
-- MODUL KEUANGAN - Database Migration
-- Tanggal: 2025-12-26
-- ================================================

-- 1. Kategori Pembayaran
CREATE TABLE IF NOT EXISTS kategori_pembayaran (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    keterangan TEXT,
    nominal_default DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tagihan Santri
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

-- 3. Pembayaran Santri
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

-- 4. Kas Pemasukan
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

-- 5. Kas Pengeluaran
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

-- 6. Anggaran
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

-- 7. Realisasi Dana
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

-- ================================================
-- INDEXES untuk performa
-- ================================================
CREATE INDEX IF NOT EXISTS idx_tagihan_santri_id ON tagihan_santri(santri_id);
CREATE INDEX IF NOT EXISTS idx_tagihan_status ON tagihan_santri(status);
CREATE INDEX IF NOT EXISTS idx_pembayaran_tagihan ON pembayaran_santri(tagihan_id);
CREATE INDEX IF NOT EXISTS idx_pembayaran_tanggal ON pembayaran_santri(tanggal);
CREATE INDEX IF NOT EXISTS idx_kas_pemasukan_tanggal ON kas_pemasukan(tanggal);
CREATE INDEX IF NOT EXISTS idx_kas_pengeluaran_tanggal ON kas_pengeluaran(tanggal);
CREATE INDEX IF NOT EXISTS idx_anggaran_status ON anggaran(status);
CREATE INDEX IF NOT EXISTS idx_realisasi_anggaran ON realisasi_dana(anggaran_id);

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================
ALTER TABLE kategori_pembayaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE tagihan_santri ENABLE ROW LEVEL SECURITY;
ALTER TABLE pembayaran_santri ENABLE ROW LEVEL SECURITY;
ALTER TABLE kas_pemasukan ENABLE ROW LEVEL SECURITY;
ALTER TABLE kas_pengeluaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE anggaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE realisasi_dana ENABLE ROW LEVEL SECURITY;

-- Policy untuk authenticated users (read)
CREATE POLICY "Allow read for authenticated" ON kategori_pembayaran FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for authenticated" ON tagihan_santri FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for authenticated" ON pembayaran_santri FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for authenticated" ON kas_pemasukan FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for authenticated" ON kas_pengeluaran FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for authenticated" ON anggaran FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for authenticated" ON realisasi_dana FOR SELECT TO authenticated USING (true);

-- Policy untuk insert/update/delete (all authenticated - akan dikontrol di frontend)
CREATE POLICY "Allow all for authenticated" ON kategori_pembayaran FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON tagihan_santri FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON pembayaran_santri FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON kas_pemasukan FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON kas_pengeluaran FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON anggaran FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON realisasi_dana FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ================================================
-- UPDATE TRIGGER untuk updated_at
-- ================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_kategori_pembayaran_updated_at BEFORE UPDATE ON kategori_pembayaran FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tagihan_santri_updated_at BEFORE UPDATE ON tagihan_santri FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kas_pemasukan_updated_at BEFORE UPDATE ON kas_pemasukan FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kas_pengeluaran_updated_at BEFORE UPDATE ON kas_pengeluaran FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_anggaran_updated_at BEFORE UPDATE ON anggaran FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- INSERT DATA AWAL
-- ================================================
INSERT INTO kategori_pembayaran (nama, keterangan, nominal_default) VALUES
('SPP Bulanan', 'Sumbangan Pembinaan Pendidikan bulanan', 500000),
('Uang Makan', 'Biaya makan bulanan', 300000),
('Uang Asrama', 'Biaya asrama bulanan', 200000),
('Daftar Ulang', 'Biaya daftar ulang tahunan', 1000000),
('Seragam', 'Biaya seragam santri', 500000),
('Kegiatan', 'Biaya kegiatan pesantren', 100000)
ON CONFLICT DO NOTHING;

-- ================================================
-- DONE! Jalankan SQL ini di Supabase SQL Editor
-- ================================================
