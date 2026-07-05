-- =====================================================
-- MIGRATION: Orang Tua Asuh (OTA) System
-- Description: Adds tables for OTA management and financial tracking
-- =====================================================

-- 1. Table: orang_tua_asuh
-- Stores profile for OTA users linked to auth.users
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

-- 2. Table: ota_santri
-- Many-to-many relationship: One OTA can have multiple Santri, One Santri can have multiple OTA (theoretically, though usually 1)
-- Added UNIQUE constraint to prevent duplicate linking
CREATE TABLE IF NOT EXISTS ota_santri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ota_id UUID NOT NULL REFERENCES orang_tua_asuh(id) ON DELETE CASCADE,
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE (ota_id, santri_id)
);

-- 3. Table: ota_pemasukan
-- Records financial contributions from OTA
CREATE TABLE IF NOT EXISTS ota_pemasukan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ota_id UUID REFERENCES orang_tua_asuh(id) ON DELETE SET NULL,
  jumlah NUMERIC(15, 2) NOT NULL, -- Added precision for currency
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  keterangan TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- 4. Table: ota_pengeluaran
-- Records expenses allocated to specific Santri from OTA funds
CREATE TABLE IF NOT EXISTS ota_pengeluaran (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ota_id UUID REFERENCES orang_tua_asuh(id) ON DELETE SET NULL,
  santri_id UUID REFERENCES santri(id) ON DELETE SET NULL,
  jumlah NUMERIC(15, 2) NOT NULL,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  keterangan TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- 5. Enable RLS (Row Level Security) - Best Practice
-- Initial Policy: Admin has full access
ALTER TABLE orang_tua_asuh ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_santri ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_pemasukan ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_pengeluaran ENABLE ROW LEVEL SECURITY;

-- Policy for Admin (Full Access)
CREATE POLICY "Admin All Access orang_tua_asuh" ON orang_tua_asuh FOR ALL USING (
  exists (select 1 from user_profiles where user_id = auth.uid() and role = 'admin')
);

CREATE POLICY "Admin All Access ota_santri" ON ota_santri FOR ALL USING (
  exists (select 1 from user_profiles where user_id = auth.uid() and role = 'admin')
);

CREATE POLICY "Admin All Access ota_pemasukan" ON ota_pemasukan FOR ALL USING (
  exists (select 1 from user_profiles where user_id = auth.uid() and role = 'admin')
);

CREATE POLICY "Admin All Access ota_pengeluaran" ON ota_pengeluaran FOR ALL USING (
  exists (select 1 from user_profiles where user_id = auth.uid() and role = 'admin')
);

-- Policy for OTA (View Own Data) - Will be added after Role setup
-- Just placeholder comment here

DO $$
BEGIN
    RAISE NOTICE 'OTA Database Tables Created Successfully';
END $$;
