-- =====================================================
-- Migration: System Settings Table
-- 
-- Fitur:
-- 1. Tabel untuk menyimpan konfigurasi sistem (Sekolah, Tahun Ajaran, dll)
-- 2. Single row pattern (hanya ada 1 baris setting aktif)
-- =====================================================

-- Buat tabel system_settings
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

-- Index untuk performa (meski row sedikit, baik untuk best practice)
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_at ON system_settings(updated_at);

-- RLS untuk tabel system_settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public read access" ON system_settings;
DROP POLICY IF EXISTS "Admin write access" ON system_settings;

-- Semua user (authenticated) bisa membaca settings
CREATE POLICY "Public read access"
ON system_settings FOR SELECT
TO authenticated
USING (true);

-- Hanya admin yang bisa mengupdate settings
CREATE POLICY "Admin write access"
ON system_settings FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Insert default row jika belum ada
INSERT INTO system_settings (school_name, school_year, school_address)
SELECT 'PTQ Al-Usymuni Batuan', '2024/2025', 'Batuan, Sumenep, Madura'
WHERE NOT EXISTS (SELECT 1 FROM system_settings);

-- =====================================================
-- CATATAN PENGGUNAAN:
-- Jalankan di Supabase SQL Editor
-- =====================================================
