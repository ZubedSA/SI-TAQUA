-- =====================================================
-- MIGRATION: SISTEM AKUN WALI SANTRI
-- Sistem Akademik PTQ Al-Usymuni Batuan
-- =====================================================
-- JALANKAN SQL INI DI SUPABASE SQL EDITOR
-- =====================================================

-- =====================================================
-- 1. TAMBAH KOLOM wali_id KE TABEL SANTRI
-- =====================================================
-- wali_id mereferensikan auth.users.id (bukan UUID biasa)
-- Ini memungkinkan RLS untuk cek langsung ke auth.uid()

ALTER TABLE santri 
ADD COLUMN IF NOT EXISTS wali_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Buat index untuk performa
CREATE INDEX IF NOT EXISTS idx_santri_wali_id ON santri(wali_id);

-- =====================================================
-- 2. HELPER FUNCTIONS UNTUK WALI
-- =====================================================

-- Function untuk mendapatkan semua santri_id yang dimiliki wali saat ini
CREATE OR REPLACE FUNCTION get_my_santri_ids()
RETURNS UUID[] AS $$
DECLARE
    santri_ids UUID[];
BEGIN
    -- Cari santri yang wali_id nya sama dengan user yang login
    SELECT ARRAY_AGG(id) INTO santri_ids
    FROM santri
    WHERE wali_id = auth.uid();
    
    RETURN COALESCE(santri_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function untuk cek apakah santri_id milik wali yang login
CREATE OR REPLACE FUNCTION is_my_santri(p_santri_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM santri 
        WHERE id = p_santri_id AND wali_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function untuk cek apakah user adalah wali
CREATE OR REPLACE FUNCTION is_wali()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() = 'wali';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant functions ke authenticated users
GRANT EXECUTE ON FUNCTION get_my_santri_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION is_my_santri(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_wali() TO authenticated;

-- =====================================================
-- 3. UPDATE RLS POLICIES UNTUK SANTRI
-- =====================================================
-- Wali hanya bisa melihat santri yang wali_id nya = auth.uid()

-- Drop existing policy
DROP POLICY IF EXISTS "santri_select_policy" ON santri;

-- Create new policy: 
-- Admin & Guru = semua santri
-- Wali = hanya santri dengan wali_id = auth.uid()
CREATE POLICY "santri_select_policy" ON santri
FOR SELECT USING (
    CASE get_user_role()
        WHEN 'admin' THEN true
        WHEN 'guru' THEN true
        WHEN 'wali' THEN wali_id = auth.uid()
        ELSE false
    END
);

-- =====================================================
-- 4. UPDATE RLS POLICIES UNTUK HAFALAN
-- =====================================================
-- Wali hanya bisa melihat hafalan santri miliknya

DROP POLICY IF EXISTS "hafalan_select_policy" ON hafalan;

CREATE POLICY "hafalan_select_policy" ON hafalan
FOR SELECT USING (
    CASE get_user_role()
        WHEN 'admin' THEN true
        WHEN 'guru' THEN true
        WHEN 'wali' THEN santri_id IN (SELECT id FROM santri WHERE wali_id = auth.uid())
        ELSE false
    END
);

-- =====================================================
-- 5. UPDATE RLS POLICIES UNTUK PRESENSI
-- =====================================================
-- Wali hanya bisa melihat presensi santri miliknya

DROP POLICY IF EXISTS "presensi_select_policy" ON presensi;

CREATE POLICY "presensi_select_policy" ON presensi
FOR SELECT USING (
    CASE get_user_role()
        WHEN 'admin' THEN true
        WHEN 'guru' THEN true
        WHEN 'wali' THEN santri_id IN (SELECT id FROM santri WHERE wali_id = auth.uid())
        ELSE false
    END
);

-- =====================================================
-- 6. UPDATE RLS POLICIES UNTUK NILAI
-- =====================================================
-- Wali hanya bisa melihat nilai santri miliknya

DROP POLICY IF EXISTS "nilai_select_policy" ON nilai;

CREATE POLICY "nilai_select_policy" ON nilai
FOR SELECT USING (
    CASE get_user_role()
        WHEN 'admin' THEN true
        WHEN 'guru' THEN true
        WHEN 'wali' THEN santri_id IN (SELECT id FROM santri WHERE wali_id = auth.uid())
        ELSE false
    END
);

-- =====================================================
-- 7. UPDATE RLS POLICIES UNTUK PENCAPAIAN_HAFALAN
-- =====================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pencapaian_hafalan') THEN
        DROP POLICY IF EXISTS "pencapaian_hafalan_select_policy" ON pencapaian_hafalan;
        
        CREATE POLICY "pencapaian_hafalan_select_policy" ON pencapaian_hafalan
        FOR SELECT USING (
            CASE get_user_role()
                WHEN 'admin' THEN true
                WHEN 'guru' THEN true
                WHEN 'wali' THEN santri_id IN (SELECT id FROM santri WHERE wali_id = auth.uid())
                ELSE false
            END
        );
    END IF;
END $$;

-- =====================================================
-- 8. UPDATE RLS POLICIES UNTUK PERILAKU_SANTRI
-- =====================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'perilaku_santri') THEN
        DROP POLICY IF EXISTS "perilaku_santri_select_policy" ON perilaku_santri;
        
        CREATE POLICY "perilaku_santri_select_policy" ON perilaku_santri
        FOR SELECT USING (
            CASE get_user_role()
                WHEN 'admin' THEN true
                WHEN 'guru' THEN true
                WHEN 'wali' THEN santri_id IN (SELECT id FROM santri WHERE wali_id = auth.uid())
                ELSE false
            END
        );
    END IF;
END $$;

-- =====================================================
-- 9. UPDATE RLS POLICIES UNTUK TAUJIHAD (Catatan Guru)
-- =====================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'taujihad') THEN
        DROP POLICY IF EXISTS "taujihad_select_policy" ON taujihad;
        
        CREATE POLICY "taujihad_select_policy" ON taujihad
        FOR SELECT USING (
            CASE get_user_role()
                WHEN 'admin' THEN true
                WHEN 'guru' THEN true
                WHEN 'wali' THEN santri_id IN (SELECT id FROM santri WHERE wali_id = auth.uid())
                ELSE false
            END
        );
    END IF;
END $$;

-- =====================================================
-- 10. TABEL WALI_SANTRI_LINK (OPSIONAL)
-- =====================================================
-- Jika satu wali bisa memiliki banyak santri (misal: kakak-adik)
-- atau satu santri bisa diakses oleh banyak wali (misal: ayah dan ibu)

-- CREATE TABLE IF NOT EXISTS wali_santri_link (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     wali_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
--     santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
--     hubungan VARCHAR(50) DEFAULT 'Wali' CHECK (hubungan IN ('Ayah', 'Ibu', 'Wali', 'Kakek', 'Nenek', 'Lainnya')),
--     is_primary BOOLEAN DEFAULT false,
--     created_at TIMESTAMPTZ DEFAULT NOW(),
--     UNIQUE(wali_user_id, santri_id)
-- );

-- =====================================================
-- 11. VERIFICATION QUERIES
-- =====================================================

-- Cek kolom wali_id sudah ada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'santri' AND column_name = 'wali_id';

-- Cek policies untuk santri
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'santri';

-- =====================================================
-- 12. CONTOH: MENGHUBUNGKAN WALI DENGAN SANTRI
-- =====================================================

-- Langkah 1: Wali mendaftar / didaftarkan di Supabase Auth
-- (bisa via signUp di frontend atau manual via Supabase Dashboard)

-- Langkah 2: Admin set role wali di user_profiles
-- INSERT INTO user_profiles (user_id, email, nama, role)
-- VALUES ('uuid-dari-auth', 'wali@email.com', 'Nama Wali', 'wali');

-- Langkah 3: Admin menghubungkan wali dengan santri
-- UPDATE santri SET wali_id = 'uuid-dari-auth' WHERE id = 'uuid-santri';

-- ATAU saat membuat santri baru:
-- INSERT INTO santri (nis, nama, jenis_kelamin, wali_id, ...)
-- VALUES ('S001', 'Nama Santri', 'Laki-laki', 'uuid-wali', ...);

-- =====================================================
-- 13. TEST QUERIES (Login sebagai wali untuk test)
-- =====================================================

-- Setelah login sebagai wali, query ini seharusnya hanya mengembalikan santri miliknya:
-- SELECT * FROM santri;

-- Hafalan santri miliknya:
-- SELECT * FROM hafalan;

-- Presensi santri miliknya:
-- SELECT * FROM presensi;

-- Query ini seharusnya GAGAL atau return empty (coba akses santri lain):
-- SELECT * FROM santri WHERE id != (SELECT id FROM santri WHERE wali_id = auth.uid() LIMIT 1);

-- =====================================================
-- ROLLBACK (If needed)
-- =====================================================
-- ALTER TABLE santri DROP COLUMN wali_id;
-- DROP FUNCTION IF EXISTS get_my_santri_ids();
-- DROP FUNCTION IF EXISTS is_my_santri(UUID);
-- DROP FUNCTION IF EXISTS is_wali();
