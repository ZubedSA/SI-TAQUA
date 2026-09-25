-- ====================================================================
-- MIGRATION: PUBLIC VERIFIKASI DIGITAL KARTU SANTRI (KTS)
-- Memungkinkan siapa saja (wali, petugas, asatidz, masyarakat)
-- memverifikasi keaslian Kartu Santri via QR Code tanpa harus login.
-- ====================================================================

-- 1. Tambah Kebijakan RLS SELECT untuk 'anon' pada tabel santri
-- Hanya mengizinkan baca data santri yang terdaftar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'santri' AND policyname = 'santri_public_verifikasi_select'
    ) THEN
        CREATE POLICY "santri_public_verifikasi_select" ON santri
        FOR SELECT
        TO anon
        USING (true);
    END IF;
END $$;

-- 2. Fungsi RPC Aman dengan SECURITY DEFINER
-- Berfungsi sebagai gerbang verifikasi resmi & mengembalikan data publik santri
CREATE OR REPLACE FUNCTION public.get_santri_verifikasi(p_nis TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'id', s.id,
        'nis', s.nis,
        'nama', s.nama,
        'status', COALESCE(s.status, 'Aktif'),
        'jenis_kelamin', s.jenis_kelamin,
        'tempat_lahir', s.tempat_lahir,
        'tanggal_lahir', s.tanggal_lahir,
        'alamat', s.alamat,
        'foto_url', s.foto_url,
        'kelas', (
            SELECT json_build_object('nama', k.nama) 
            FROM kelas k 
            WHERE k.id = s.kelas_id
        ),
        'halaqoh', (
            SELECT json_build_object('nama', h.nama) 
            FROM halaqoh h 
            WHERE h.id = s.halaqoh_id
        ),
        'angkatan', (
            SELECT json_build_object('nama', a.nama) 
            FROM angkatan a 
            WHERE a.id = s.angkatan_id
        )
    ) INTO v_result
    FROM santri s
    WHERE (s.nis = p_nis OR s.id::TEXT = p_nis)
    LIMIT 1;

    RETURN v_result;
END;
$$;

-- Berikan izin akses eksekusi ke anon dan authenticated
GRANT EXECUTE ON FUNCTION public.get_santri_verifikasi(TEXT) TO anon, authenticated;
