-- =========================================================================
-- CREATE_BUKTI_TRANSFER_TABLE.sql
-- Membuat tabel bukti_transfer untuk konfirmasi pembayaran
-- =========================================================================

-- =====================================================
-- 1. CREATE TABLE
-- =====================================================
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

-- =====================================================
-- 2. CREATE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_bukti_transfer_santri ON bukti_transfer(santri_id);
CREATE INDEX IF NOT EXISTS idx_bukti_transfer_wali ON bukti_transfer(wali_id);
CREATE INDEX IF NOT EXISTS idx_bukti_transfer_status ON bukti_transfer(status);
CREATE INDEX IF NOT EXISTS idx_bukti_transfer_tagihan ON bukti_transfer(tagihan_id);
CREATE INDEX IF NOT EXISTS idx_bukti_transfer_created ON bukti_transfer(created_at DESC);

-- =====================================================
-- 3. ENABLE RLS
-- =====================================================
ALTER TABLE bukti_transfer ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. RLS POLICIES
-- =====================================================
-- Drop existing policies
DROP POLICY IF EXISTS "Wali can view own bukti" ON bukti_transfer;
DROP POLICY IF EXISTS "Wali can insert own bukti" ON bukti_transfer;
DROP POLICY IF EXISTS "Bendahara can view all bukti" ON bukti_transfer;
DROP POLICY IF EXISTS "Bendahara can update bukti" ON bukti_transfer;

-- Wali can view their own submissions
CREATE POLICY "Wali can view own bukti" ON bukti_transfer
    FOR SELECT USING (wali_id = auth.uid());

-- Wali can insert their own submissions
CREATE POLICY "Wali can insert own bukti" ON bukti_transfer
    FOR INSERT WITH CHECK (wali_id = auth.uid());

-- Bendahara/Admin can view all
CREATE POLICY "Bendahara can view all bukti" ON bukti_transfer
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND (role IN ('admin', 'bendahara') OR 'admin' = ANY(roles) OR 'bendahara' = ANY(roles))
        )
    );

-- Bendahara/Admin can update (verify/reject)
CREATE POLICY "Bendahara can update bukti" ON bukti_transfer
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND (role IN ('admin', 'bendahara') OR 'admin' = ANY(roles) OR 'bendahara' = ANY(roles))
        )
    );

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================
GRANT SELECT, INSERT, UPDATE ON bukti_transfer TO authenticated;

SELECT '✅ Tabel bukti_transfer berhasil dibuat!' as status;
