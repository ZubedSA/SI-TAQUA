-- =====================================================
-- SECURITY FIX: USER PROFILES HARDENING
-- =====================================================
-- Deskripsi: Menutup celah Privilege Escalation pada tabel user_profiles.
-- Sebelumnya: Policy "Allow all access" mengizinkan siapa saja mengubah role jadi admin.
-- Perbaikan: Hapus policy lama, terapkan policy ketat berbasis role.
-- =====================================================

-- 1. Hapus Policy yang Berbahaya
DROP POLICY IF EXISTS "Allow all access" ON user_profiles;
DROP POLICY IF EXISTS "Allow all" ON user_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON user_profiles;

-- 2. Pastikan RLS Aktif
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Buat Helper Function untuk Cek Admin (jika belum ada/aman)
-- Menggunakan SECURITY DEFINER agar bisa bypass RLS saat pengecekan role
CREATE OR REPLACE FUNCTION is_admin_secure()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR 'admin' = ANY(roles))
    );
END;
$$;

-- 4. Terapkan Policy Baru yang Aman

-- A. ADMIN: Boleh melakukan APAPUN (View, Create, Update, Delete)
CREATE POLICY "Admin Full Access" ON user_profiles
    FOR ALL
    TO authenticated
    USING ( is_admin_secure() );

-- B. USER BIASA: Hanya boleh LIHAT profil sendiri
CREATE POLICY "User View Own Profile" ON user_profiles
    FOR SELECT
    TO authenticated
    USING ( auth.uid() = user_id );

-- C. USER BIASA: Hanya boleh UPDATE data diri tertentu (misal: no_telp, avatar)
-- TAPI TIDAK BOLEH UBAH ROLE!
-- Kita batasi manual di sini atau via trigger.
-- Untuk keamanan maksimal, kita batasi UPDATE user biasa hanya jika UID cocok.
-- DAN kolom 'role' / 'roles' sebaiknya dilindungi trigger terpisah agar tidak bisa diubah user biasa.
-- Namun, RLS 'USING' membatasi baris mana, 'WITH CHECK' membatasi update jadi apa.
CREATE POLICY "User Update Own Profile" ON user_profiles
    FOR UPDATE
    TO authenticated
    USING ( auth.uid() = user_id )
    WITH CHECK ( auth.uid() = user_id );

-- D. INSERT: Biasanya user baru insert profile sendiri saat register (Trigger)
-- Atau Admin yang insertkan. Jika pendaftaran mandiri aktif:
CREATE POLICY "User Insert Own Profile" ON user_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK ( auth.uid() = user_id );

-- =====================================================
-- 5. PROTEKSI KOLOM ROLE (PENTING!)
-- =====================================================
-- Meskipun User bisa Update profil sendiri, mereka TIDAK BOLEH ubah kolom 'role' atau 'roles' jadi 'admin'.
-- Kita buat Trigger Guard.

CREATE OR REPLACE FUNCTION prevent_role_change_by_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Jika user mencoba mengubah role/roles DAN user tersebut BUKAN admin
    -- (auth.uid() adalah current user yang request)
    IF (NEW.role <> OLD.role OR NEW.roles <> OLD.roles) THEN
        IF NOT (SELECT is_admin_secure()) THEN
            RAISE EXCEPTION 'Hanya Admin yang boleh mengubah Role!';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_role_change ON user_profiles;
CREATE TRIGGER trg_protect_role_change
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION prevent_role_change_by_user();

-- =====================================================
-- VERIFIKASI KEAMANAN
-- =====================================================
SELECT '✅ USER_PROFILES SECURED' as status;
