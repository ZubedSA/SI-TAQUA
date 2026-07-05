-- =====================================================
-- MIGRATION: OTA Extended Features
-- Description: Adds kategori table and new columns for OTA management
-- Date: 2026-01-01
-- =====================================================

-- 1. Table: ota_kategori (master kategori OTA)
CREATE TABLE IF NOT EXISTS ota_kategori (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama VARCHAR(100) NOT NULL,
  keterangan TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Enable RLS for new table
ALTER TABLE ota_kategori ENABLE ROW LEVEL SECURITY;

-- Policy for Admin (Full Access)
CREATE POLICY "Admin All Access ota_kategori" ON ota_kategori FOR ALL USING (
  exists (select 1 from user_profiles where user_id = auth.uid() and role = 'admin')
);

-- Policy for OTA (Read Only)
CREATE POLICY "OTA Read ota_kategori" ON ota_kategori FOR SELECT USING (
  exists (select 1 from user_profiles where user_id = auth.uid() and role = 'ota')
);

-- 2. Add columns to orang_tua_asuh (if not exists)
DO $$ 
BEGIN
  -- Add alamat column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orang_tua_asuh' AND column_name = 'alamat') THEN
    ALTER TABLE orang_tua_asuh ADD COLUMN alamat TEXT;
  END IF;
  
  -- Add kategori_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orang_tua_asuh' AND column_name = 'kategori_id') THEN
    ALTER TABLE orang_tua_asuh ADD COLUMN kategori_id UUID REFERENCES ota_kategori(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Add metode column to ota_pemasukan (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ota_pemasukan' AND column_name = 'metode') THEN
    ALTER TABLE ota_pemasukan ADD COLUMN metode VARCHAR(50) DEFAULT 'Transfer';
  END IF;
END $$;

-- 4. Insert default categories
INSERT INTO ota_kategori (nama, keterangan) VALUES
('Perorangan', 'Donatur perorangan/individu'),
('Lembaga', 'Donatur dari lembaga/organisasi'),
('Yayasan', 'Donatur dari yayasan'),
('Perusahaan', 'Donatur dari perusahaan/CSR')
ON CONFLICT DO NOTHING;

-- 5. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_ota_kategori_id ON orang_tua_asuh(kategori_id);
CREATE INDEX IF NOT EXISTS idx_ota_pemasukan_tanggal ON ota_pemasukan(tanggal);
CREATE INDEX IF NOT EXISTS idx_ota_pengeluaran_tanggal ON ota_pengeluaran(tanggal);

DO $$
BEGIN
    RAISE NOTICE 'OTA Extended Migration Completed Successfully';
END $$;
