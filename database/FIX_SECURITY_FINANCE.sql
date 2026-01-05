-- =====================================================
-- SECURITY FIX: FINANCIAL MODULE HARDENING
-- =====================================================
-- Deskripsi: Menutup celah Manipulasi Keuangan.
-- Sebelumnya: Policy "Allow all for authenticated" mengizinkan user biasa insert/delete transaksi.
-- Perbaikan: Batasi INSERT/UPDATE/DELETE hanya untuk Admin & Bendahara.
-- =====================================================

-- 1. Buat Helper Function Bendahara
CREATE OR REPLACE FUNCTION is_bendahara_secure()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (
            role IN ('admin', 'bendahara') OR 
            'admin' = ANY(roles) OR
            'bendahara' = ANY(roles)
        )
    );
END;
$$;

-- 2. Daftar Tabel Keuangan yang Akan Diamankan
-- kas_pemasukan, kas_pengeluaran, realisasi_dana, tagihan_santri, pembayaran_santri, anggaran, kategori_pembayaran

-- =====================================================
-- HARDENING: KAS PEMASUKAN
-- =====================================================
DROP POLICY IF EXISTS "Allow all for authenticated" ON kas_pemasukan;
DROP POLICY IF EXISTS "Allow read for authenticated" ON kas_pemasukan;

-- Policy Baru:
-- VIEW: Semua user authenticated boleh lihat (Transparansi - atau bisa dibatasi juga)
-- EDIT: Hanya Bendahara/Admin
CREATE POLICY "Auth View Kas Pemasukan" ON kas_pemasukan FOR SELECT TO authenticated USING (true);
CREATE POLICY "Bendahara Manage Kas Pemasukan" ON kas_pemasukan FOR ALL TO authenticated 
    USING ( is_bendahara_secure() )
    WITH CHECK ( is_bendahara_secure() );

-- =====================================================
-- HARDENING: KAS PENGELUARAN
-- =====================================================
DROP POLICY IF EXISTS "Allow all for authenticated" ON kas_pengeluaran;
DROP POLICY IF EXISTS "Allow read for authenticated" ON kas_pengeluaran;

CREATE POLICY "Auth View Kas Pengeluaran" ON kas_pengeluaran FOR SELECT TO authenticated USING (true);
CREATE POLICY "Bendahara Manage Kas Pengeluaran" ON kas_pengeluaran FOR ALL TO authenticated 
    USING ( is_bendahara_secure() )
    WITH CHECK ( is_bendahara_secure() );

-- =====================================================
-- HARDENING: REALISASI DANA
-- =====================================================
DROP POLICY IF EXISTS "Allow all for authenticated" ON realisasi_dana;
DROP POLICY IF EXISTS "Allow read for authenticated" ON realisasi_dana;

CREATE POLICY "Auth View Realisasi" ON realisasi_dana FOR SELECT TO authenticated USING (true);
CREATE POLICY "Bendahara Manage Realisasi" ON realisasi_dana FOR ALL TO authenticated 
    USING ( is_bendahara_secure() )
    WITH CHECK ( is_bendahara_secure() );

-- =====================================================
-- HARDENING: ANGGARAN
-- =====================================================
DROP POLICY IF EXISTS "Allow all for authenticated" ON anggaran;
DROP POLICY IF EXISTS "Allow read for authenticated" ON anggaran;

CREATE POLICY "Auth View Anggaran" ON anggaran FOR SELECT TO authenticated USING (true);
CREATE POLICY "Bendahara Manage Anggaran" ON anggaran FOR ALL TO authenticated 
    USING ( is_bendahara_secure() )
    WITH CHECK ( is_bendahara_secure() );

-- =====================================================
-- HARDENING: PEMBAYARAN SANTRI
-- =====================================================
DROP POLICY IF EXISTS "Allow all for authenticated" ON pembayaran_santri;
DROP POLICY IF EXISTS "Allow read for authenticated" ON pembayaran_santri;

-- VIEW:
-- 1. Admin/Bendahara: Semua
-- 2. Wali/Santri: Hanya data anaknya (JOIN logikanya agak berat di RLS, 
--    opsi mudah: Wali boleh lihat semua pembayaran (transparansi) ATAU hanya miliknya via user_profiles relation.
--    Untuk performa & simplicity di level ini kita izinkan SELECT all auth dulu (low risk check payments),
--    TAPI WRITE wajib secure.
CREATE POLICY "Auth View Pembayaran" ON pembayaran_santri FOR SELECT TO authenticated USING (true);

-- EDIT: Hanya Bendahara/Admin
CREATE POLICY "Bendahara Manage Pembayaran" ON pembayaran_santri FOR ALL TO authenticated 
    USING ( is_bendahara_secure() )
    WITH CHECK ( is_bendahara_secure() );

-- =====================================================
-- HARDENING: TAGIHAN SANTRI
-- =====================================================
DROP POLICY IF EXISTS "Allow all for authenticated" ON tagihan_santri;
DROP POLICY IF EXISTS "Allow read for authenticated" ON tagihan_santri;

CREATE POLICY "Auth View Tagihan" ON tagihan_santri FOR SELECT TO authenticated USING (true);
CREATE POLICY "Bendahara Manage Tagihan" ON tagihan_santri FOR ALL TO authenticated 
    USING ( is_bendahara_secure() )
    WITH CHECK ( is_bendahara_secure() );

-- =====================================================
-- HARDENING: KATEGORI PEMBAYARAN
-- =====================================================
DROP POLICY IF EXISTS "Allow all for authenticated" ON kategori_pembayaran;
DROP POLICY IF EXISTS "Allow read for authenticated" ON kategori_pembayaran;

CREATE POLICY "Auth View Kategori" ON kategori_pembayaran FOR SELECT TO authenticated USING (true);
CREATE POLICY "Bendahara Manage Kategori" ON kategori_pembayaran FOR ALL TO authenticated 
    USING ( is_bendahara_secure() )
    WITH CHECK ( is_bendahara_secure() );


-- =====================================================
-- VERIFIKASI
-- =====================================================
SELECT '✅ FINANCIAL TABLES SECURED' as status;
