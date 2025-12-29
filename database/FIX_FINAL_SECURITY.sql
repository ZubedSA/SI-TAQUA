-- =====================================================
-- FIX FINAL SECURITY (STRICT RLS ENFORCEMENT)
-- Tanggal: 2025-12-29
-- Deskripsi: Menerapkan keamanan tingkat database yang ketat untuk semua role.
-- =====================================================

-- 1. CLEANUP & HELPER FUNCTION (Ensure Clean State)
-- =====================================================
DROP FUNCTION IF EXISTS get_current_user_role() CASCADE;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM user_profiles
    WHERE user_id = auth.uid();
    
    RETURN COALESCE(user_role, 'guest');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS get_my_santri_ids() CASCADE;

CREATE OR REPLACE FUNCTION get_my_santri_ids()
RETURNS TABLE (santri_id UUID) AS $$
BEGIN
    RETURN QUERY SELECT id FROM santri WHERE wali_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper untuk drop policy (Safe Drop)
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'santri', 'guru', 'kelas', 'mapel', 'halaqoh', 'semester', 
        'hafalan', 'nilai', 'presensi', 'pencapaian_hafalan', 'taujihad',
        'kas_pemasukan', 'kas_pengeluaran', 'anggaran', 'realisasi_dana', 'kategori_pembayaran', 'tagihan_santri', 'pembayaran_santri'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "select_policy" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "insert_policy" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "update_policy" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "delete_policy" ON %I', t);
        -- Drop legacy policies named differently
        EXECUTE format('DROP POLICY IF EXISTS "Allow read for authenticated" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "santri_select_strict" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "santri_modify_admin" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "santri_update_guru" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "hafalan_modify_staff" ON %I', t);
        
        -- Enable RLS
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;


-- 2. DATA PONDOK (MASTER DATA)
-- =====================================================
-- Rule: Admin (Full), Guru/Bendahara/Pengasuh (Read Only), Wali (Read Partial)

-- SANTRI
CREATE POLICY "select_policy" ON santri FOR SELECT USING (
    get_current_user_role() IN ('admin', 'guru', 'bendahara', 'pengasuh') OR
    (get_current_user_role() = 'wali' AND wali_id = auth.uid()) OR
    (get_current_user_role() = 'santri' AND id = (SELECT santri_id FROM user_profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "insert_policy" ON santri FOR INSERT WITH CHECK (get_current_user_role() = 'admin');
CREATE POLICY "update_policy" ON santri FOR UPDATE USING (get_current_user_role() = 'admin');
CREATE POLICY "delete_policy" ON santri FOR DELETE USING (get_current_user_role() = 'admin');

-- GURU, KELAS, MAPEL, HALAQOH, SEMESTER (Master Data Umum)
-- Guru/Bendahara need to SELECT to display lists.
DO $$
DECLARE
    t text;
    master_tables text[] := ARRAY['guru', 'kelas', 'mapel', 'halaqoh', 'semester'];
BEGIN
    FOREACH t IN ARRAY master_tables LOOP
        EXECUTE format('CREATE POLICY "select_policy" ON %I FOR SELECT USING (get_current_user_role() IN (''admin'', ''guru'', ''bendahara'', ''pengasuh'', ''wali''))', t);
        EXECUTE format('CREATE POLICY "insert_policy" ON %I FOR INSERT WITH CHECK (get_current_user_role() = ''admin'')', t);
        EXECUTE format('CREATE POLICY "update_policy" ON %I FOR UPDATE USING (get_current_user_role() = ''admin'')', t);
        EXECUTE format('CREATE POLICY "delete_policy" ON %I FOR DELETE USING (get_current_user_role() = ''admin'')', t);
    END LOOP;
END $$;


-- 3. AKADEMIK (Hafalan, Nilai, Presensi)
-- =====================================================
-- Rule: Admin/Guru (Full), Wali/Santri (Read Own), Bendahara/Pengasuh (Read Only - maybe for reporting?)

-- HAFALAN
CREATE POLICY "select_policy" ON hafalan FOR SELECT USING (
    get_current_user_role() IN ('admin', 'guru') OR
    (get_current_user_role() = 'wali' AND santri_id IN (SELECT santri_id FROM get_my_santri_ids())) OR
    (get_current_user_role() = 'santri' AND santri_id = (SELECT santri_id FROM user_profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "insert_policy" ON hafalan FOR INSERT WITH CHECK (get_current_user_role() IN ('admin', 'guru'));
CREATE POLICY "update_policy" ON hafalan FOR UPDATE USING (get_current_user_role() IN ('admin', 'guru'));
CREATE POLICY "delete_policy" ON hafalan FOR DELETE USING (get_current_user_role() IN ('admin', 'guru'));

-- NILAI (Mirror Hafalan)
CREATE POLICY "select_policy" ON nilai FOR SELECT USING (
    get_current_user_role() IN ('admin', 'guru') OR
    (get_current_user_role() = 'wali' AND santri_id IN (SELECT santri_id FROM get_my_santri_ids())) OR
    (get_current_user_role() = 'santri' AND santri_id = (SELECT santri_id FROM user_profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "insert_policy" ON nilai FOR INSERT WITH CHECK (get_current_user_role() IN ('admin', 'guru'));
CREATE POLICY "update_policy" ON nilai FOR UPDATE USING (get_current_user_role() IN ('admin', 'guru'));
CREATE POLICY "delete_policy" ON nilai FOR DELETE USING (get_current_user_role() IN ('admin', 'guru'));

-- PRESENSI & EXTRA TABLES (Mirror Hafalan)
DO $$
DECLARE
    t text;
    akademik_tables text[] := ARRAY['presensi', 'pencapaian_hafalan', 'taujihad'];
BEGIN
    FOREACH t IN ARRAY akademik_tables LOOP
        EXECUTE format('CREATE POLICY "select_policy" ON %I FOR SELECT USING (
            get_current_user_role() IN (''admin'', ''guru'', ''bendahara'', ''pengasuh'') OR
            (get_current_user_role() = ''wali'' AND santri_id IN (SELECT santri_id FROM get_my_santri_ids()))
        )', t);
        EXECUTE format('CREATE POLICY "insert_policy" ON %I FOR INSERT WITH CHECK (get_current_user_role() IN (''admin'', ''guru''))', t);
        EXECUTE format('CREATE POLICY "update_policy" ON %I FOR UPDATE USING (get_current_user_role() IN (''admin'', ''guru''))', t);
        EXECUTE format('CREATE POLICY "delete_policy" ON %I FOR DELETE USING (get_current_user_role() IN (''admin'', ''guru''))', t);
    END LOOP;
END $$;


-- 4. KEUANGAN (KAS, ANGGARAN, REALISASI)
-- =====================================================
-- Rule: Admin/Bendahara (Full), Pengasuh (Read Only). Guru/Wali/Santri (NO ACCESS or Very Limited)

-- KAS (Pemasukan/Pengeluaran), ANGGARAN, REALISASI, KATEGORI
DO $$
DECLARE
    t text;
    keuangan_tables text[] := ARRAY['kas_pemasukan', 'kas_pengeluaran', 'anggaran', 'realisasi_dana', 'kategori_pembayaran'];
BEGIN
    FOREACH t IN ARRAY keuangan_tables LOOP
        -- Read: Admin, Bendahara, Pengasuh. (Wali/Guru NO ACCESS to internal cash flow)
        EXECUTE format('CREATE POLICY "select_policy" ON %I FOR SELECT USING (get_current_user_role() IN (''admin'', ''bendahara'', ''pengasuh''))', t);
        -- Write: Admin, Bendahara
        EXECUTE format('CREATE POLICY "insert_policy" ON %I FOR INSERT WITH CHECK (get_current_user_role() IN (''admin'', ''bendahara''))', t);
        EXECUTE format('CREATE POLICY "update_policy" ON %I FOR UPDATE USING (get_current_user_role() IN (''admin'', ''bendahara''))', t);
        EXECUTE format('CREATE POLICY "delete_policy" ON %I FOR DELETE USING (get_current_user_role() IN (''admin'', ''bendahara''))', t);
    END LOOP;
END $$;


-- 5. KEUANGAN SANTRI (Tagihan, Pembayaran)
-- =====================================================
-- Rule: Admin/Bendahara (Full), Pengasuh (Read), Wali (Read Own), Santri (Read Own)

-- TAGIHAN SANTRI
CREATE POLICY "select_policy" ON tagihan_santri FOR SELECT USING (
    get_current_user_role() IN ('admin', 'bendahara', 'pengasuh') OR
    (get_current_user_role() = 'wali' AND santri_id IN (SELECT santri_id FROM get_my_santri_ids())) OR
    (get_current_user_role() = 'santri' AND santri_id = (SELECT santri_id FROM user_profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "insert_policy" ON tagihan_santri FOR INSERT WITH CHECK (get_current_user_role() IN ('admin', 'bendahara'));
CREATE POLICY "update_policy" ON tagihan_santri FOR UPDATE USING (get_current_user_role() IN ('admin', 'bendahara'));
CREATE POLICY "delete_policy" ON tagihan_santri FOR DELETE USING (get_current_user_role() IN ('admin', 'bendahara'));

-- PEMBAYARAN SANTRI
CREATE POLICY "select_policy" ON pembayaran_santri FOR SELECT USING (
    get_current_user_role() IN ('admin', 'bendahara', 'pengasuh') OR
    (get_current_user_role() = 'wali' AND santri_id IN (SELECT santri_id FROM get_my_santri_ids())) OR
    (get_current_user_role() = 'santri' AND santri_id = (SELECT santri_id FROM user_profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "insert_policy" ON pembayaran_santri FOR INSERT WITH CHECK (get_current_user_role() IN ('admin', 'bendahara'));
CREATE POLICY "update_policy" ON pembayaran_santri FOR UPDATE USING (get_current_user_role() IN ('admin', 'bendahara'));
CREATE POLICY "delete_policy" ON pembayaran_santri FOR DELETE USING (get_current_user_role() IN ('admin', 'bendahara'));


-- =====================================================
-- 6. ADMIN USER MANAGEMENT (SECURE EMAIL UPDATE)
-- =====================================================

CREATE OR REPLACE FUNCTION admin_update_user_email(
    target_user_id UUID,
    new_email TEXT,
    new_username TEXT,
    new_full_name TEXT,
    new_role TEXT,
    new_roles TEXT[],
    new_active_role TEXT DEFAULT NULL,
    new_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old_email TEXT;
    v_check_id UUID;
    v_final_active_role TEXT;
    v_rows_affected INT;
BEGIN
    -- 1. Check Permissions (Admin Only)
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR 'admin' = ANY(roles))
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Admin only');
    END IF;

    -- 2. Validate Target User
    SELECT email INTO v_old_email FROM auth.users WHERE id = target_user_id;
    IF v_old_email IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found in Auth');
    END IF;

    -- 3. Check Email Uniqueness (if changed)
    IF v_old_email <> new_email THEN
        SELECT id INTO v_check_id FROM auth.users WHERE email = new_email;
        IF v_check_id IS NOT NULL THEN
             RETURN jsonb_build_object('success', false, 'message', 'Email already used by another user');
        END IF;
    END IF;

    -- 4. Calculate Active Role
    v_final_active_role := COALESCE(new_active_role, new_role);

    -- 5. Update Auth User (Email & Metadata)
    -- We force email update and clear any pending change tokens
    UPDATE auth.users
    SET 
        email = new_email,
        updated_at = NOW(),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        email_change = '',
        email_change_token_new = '',
        email_change_confirm_status = 0,
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
            'nama', new_full_name,
            'role', new_role,
            'username', new_username
        )
    WHERE id = target_user_id;
    
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    IF v_rows_affected = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Critical Error: Failed to update auth.users (No rows affected).');
    END IF;

    -- 5b. Update Auth Identities (CRITICAL for Dashboard Visibility)
    -- Sync email in identities table to match the new email
    UPDATE auth.identities
    SET 
        email = new_email,
        identity_data = jsonb_set(COALESCE(identity_data, '{}'::jsonb), '{email}', to_jsonb(new_email)),
        updated_at = NOW()
    WHERE user_id = target_user_id AND provider = 'email';

    -- 6. Update Profile
    UPDATE user_profiles
    SET
        email = new_email,
        nama = new_full_name,
        username = new_username,
        role = new_role,
        roles = new_roles,
        active_role = v_final_active_role,
        phone = new_phone
    WHERE user_id = target_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'User and Auth Data updated successfully');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Database Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_user_email TO authenticated;

-- =====================================================
-- SELESAI
-- =====================================================
