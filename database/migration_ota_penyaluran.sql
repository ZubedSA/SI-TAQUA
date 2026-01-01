-- =====================================================
-- MIGRATION: OTA Pool Dana System
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: Create Tables (IF NOT EXISTS - safe)
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

-- Table 2: ota_pool_dana
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

-- Table 3: ota_penyaluran_detail
CREATE TABLE IF NOT EXISTS ota_penyaluran_detail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL REFERENCES ota_pool_dana(id) ON DELETE CASCADE,
    santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
    nominal NUMERIC(15,2) NOT NULL CHECK (nominal > 0),
    keterangan TEXT,
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE(pool_id, santri_id)
);

-- =====================================================
-- STEP 2: Create Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_santri_penerima_ota_santri ON santri_penerima_ota(santri_id);
CREATE INDEX IF NOT EXISTS idx_santri_penerima_ota_status ON santri_penerima_ota(status);
CREATE INDEX IF NOT EXISTS idx_ota_pool_dana_periode ON ota_pool_dana(tahun, bulan);
CREATE INDEX IF NOT EXISTS idx_ota_pool_dana_status ON ota_pool_dana(status);
CREATE INDEX IF NOT EXISTS idx_ota_penyaluran_detail_pool ON ota_penyaluran_detail(pool_id);
CREATE INDEX IF NOT EXISTS idx_ota_penyaluran_detail_santri ON ota_penyaluran_detail(santri_id);

-- =====================================================
-- STEP 3: Enable RLS
-- =====================================================
ALTER TABLE santri_penerima_ota ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_pool_dana ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_penyaluran_detail ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: Create RLS Policies (with IF NOT EXISTS pattern)
-- =====================================================

-- santri_penerima_ota
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'santri_penerima_ota' AND policyname = 'Admin All Access santri_penerima_ota') THEN
        CREATE POLICY "Admin All Access santri_penerima_ota" ON santri_penerima_ota
        FOR ALL USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin'));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'santri_penerima_ota' AND policyname = 'OTA Bendahara Read santri_penerima_ota') THEN
        CREATE POLICY "OTA Bendahara Read santri_penerima_ota" ON santri_penerima_ota
        FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('ota', 'bendahara')));
    END IF;
END $$;

-- ota_pool_dana
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ota_pool_dana' AND policyname = 'Admin All Access ota_pool_dana') THEN
        CREATE POLICY "Admin All Access ota_pool_dana" ON ota_pool_dana
        FOR ALL USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin'));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ota_pool_dana' AND policyname = 'OTA Bendahara Read ota_pool_dana') THEN
        CREATE POLICY "OTA Bendahara Read ota_pool_dana" ON ota_pool_dana
        FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('ota', 'bendahara')));
    END IF;
END $$;

-- ota_penyaluran_detail
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ota_penyaluran_detail' AND policyname = 'Admin All Access ota_penyaluran_detail') THEN
        CREATE POLICY "Admin All Access ota_penyaluran_detail" ON ota_penyaluran_detail
        FOR ALL USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin'));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ota_penyaluran_detail' AND policyname = 'OTA Bendahara Read ota_penyaluran_detail') THEN
        CREATE POLICY "OTA Bendahara Read ota_penyaluran_detail" ON ota_penyaluran_detail
        FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('ota', 'bendahara')));
    END IF;
END $$;

-- =====================================================
-- STEP 5: Create Functions
-- =====================================================

-- Function: Auto-update timestamp
CREATE OR REPLACE FUNCTION update_pool_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate sisa_saldo
CREATE OR REPLACE FUNCTION calculate_pool_sisa_saldo()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sisa_saldo = NEW.total_pemasukan - NEW.total_tersalurkan;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 6: Create Triggers (DROP first if exists)
-- =====================================================

DROP TRIGGER IF EXISTS trg_santri_penerima_ota_updated ON santri_penerima_ota;
CREATE TRIGGER trg_santri_penerima_ota_updated
    BEFORE UPDATE ON santri_penerima_ota
    FOR EACH ROW EXECUTE FUNCTION update_pool_updated_at();

DROP TRIGGER IF EXISTS trg_ota_pool_dana_updated ON ota_pool_dana;
CREATE TRIGGER trg_ota_pool_dana_updated
    BEFORE UPDATE ON ota_pool_dana
    FOR EACH ROW EXECUTE FUNCTION update_pool_updated_at();

DROP TRIGGER IF EXISTS trg_ota_pool_saldo ON ota_pool_dana;
CREATE TRIGGER trg_ota_pool_saldo
    BEFORE INSERT OR UPDATE ON ota_pool_dana
    FOR EACH ROW EXECUTE FUNCTION calculate_pool_sisa_saldo();

-- =====================================================
-- DONE
-- =====================================================
SELECT 'OTA Pool Dana Migration Completed!' as result;
