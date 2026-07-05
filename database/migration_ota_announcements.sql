-- =====================================================
-- MIGRATION: OTA Announcements & RLS Update
-- Description: Adds announcements table and enables logic for OTA to view their own data
-- =====================================================

-- 1. Table: ota_announcements
CREATE TABLE IF NOT EXISTS ota_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judul VARCHAR(200) NOT NULL,
  isi TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT now()
);

-- Enable RLS for announcements
ALTER TABLE ota_announcements ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can do everything
CREATE POLICY "Admin All Access ota_announcements" ON ota_announcements FOR ALL USING (
  exists (select 1 from user_profiles where user_id = auth.uid() and role = 'admin')
);

-- Policy: OTA can read active announcements
CREATE POLICY "OTA Read Active Announcements" ON ota_announcements FOR SELECT USING (
  is_active = true
);

-- =====================================================
-- CRITICAL: RLS Policies for OTA User Access
-- =====================================================

-- 1. Orang Tua Asuh (Profile)
-- OTA can view their own profile
CREATE POLICY "OTA View Own Profile" ON orang_tua_asuh FOR SELECT USING (
  user_id = auth.uid()
);

-- 2. OTA Santri (Binaan Link)
-- OTA can view links where they are the owner
CREATE POLICY "OTA View Own Santri Link" ON ota_santri FOR SELECT USING (
  ota_id IN (
    SELECT id FROM orang_tua_asuh WHERE user_id = auth.uid()
  )
);

-- 3. OTA Pemasukan (Donasi History)
-- OTA can view their own donation records
CREATE POLICY "OTA View Own Pemasukan" ON ota_pemasukan FOR SELECT USING (
  ota_id IN (
    SELECT id FROM orang_tua_asuh WHERE user_id = auth.uid()
  )
);

-- 4. OTA Pengeluaran (Expense History)
-- OTA can view expenses related to them
CREATE POLICY "OTA View Own Pengeluaran" ON ota_pengeluaran FOR SELECT USING (
  ota_id IN (
    SELECT id FROM orang_tua_asuh WHERE user_id = auth.uid()
  )
);

-- Seed initial announcement
INSERT INTO ota_announcements (judul, isi) 
VALUES ('Selamat Datang', 'Terima kasih telah menjadi Orang Tua Asuh. Laporan penggunaan dana akan diperbarui setiap tanggal 5 bulan berjalan.');
