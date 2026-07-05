-- =====================================================
-- PERFORMANCE OPTIMIZATION: DATABASE RLS & INDEXING
-- =====================================================
-- Deskripsi: Mengoptimalkan fungsi RLS agar lebih cepat (STABLE)
-- dan menambahkan index untuk query yang sering lambat.
-- =====================================================

BEGIN;

-- =====================================================
-- 1. OPTIMASI RLS HELPER FUNCTIONS
-- =====================================================
-- Mengubah fungsi menjadi STABLE agar PostgreSQL dapat
-- melakukan caching hasil fungsi selama satu query yang sama.

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM user_profiles
    WHERE user_id = auth.uid();
    
    RETURN COALESCE(user_role, 'guest');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_guru_id()
RETURNS UUID AS $$
DECLARE
    g_id UUID;
BEGIN
    SELECT guru_id INTO g_id
    FROM user_profiles
    WHERE user_id = auth.uid();
    
    RETURN g_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin_or_guru()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() IN ('admin', 'guru');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- =====================================================
-- 2. INDEXING UNTUK TABEL JURNAL & PRESENSI
-- =====================================================

-- Index composite untuk presensi_mapel (sering dicari berdasarkan tanggal dan jadwal)
CREATE INDEX IF NOT EXISTS idx_presensi_mapel_tanggal_jadwal 
ON public.presensi_mapel(tanggal, jadwal_id);

-- Index untuk detail presensi agar join lebih cepat
CREATE INDEX IF NOT EXISTS idx_presensi_mapel_detil_header_santri 
ON public.presensi_mapel_detil(presensi_mapel_id, santri_id);

-- Index untuk presensi harian agar pencarian per kelas lebih cepat
CREATE INDEX IF NOT EXISTS idx_presensi_tanggal_santri 
ON public.presensi(tanggal, santri_id);

-- Index untuk santri berdasarkan status agar filter santri aktif lebih cepat
CREATE INDEX IF NOT EXISTS idx_santri_status_aktif 
ON public.santri(status) WHERE status = 'Aktif';


-- =====================================================
-- 3. OPTIMASI QUERY USER_PROFILES
-- =====================================================

-- Pastikan ada index btree untuk user_id di user_profiles (biasanya sudah ada lewat UNIQUE)
-- Namun index tambahan untuk roles (jika menggunakan kolom roles JSONB atau ARRAY) sangat membantu
-- Jika Anda menggunakan kolom 'roles' (array), tambahkan index GIN
-- CREATE INDEX IF NOT EXISTS idx_user_profiles_roles_gin ON public.user_profiles USING GIN (roles);

COMMIT;

SELECT '✅ Optimasi Performa Database Berhasil!' as status;
