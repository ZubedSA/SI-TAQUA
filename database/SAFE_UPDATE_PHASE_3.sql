-- =====================================================
-- SAFE UPDATE PHASE 3: SECURITY & SUSPICIOUS ACCOUNTS
-- =====================================================
-- Deskripsi: Menambahkan tabel log aktivitas, deteksi akun mencurigakan, 
-- dan RPC untuk proteksi Brute Force + Challenge System.
-- =====================================================

-- 1. TABEL: USER ACTIVITY LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Nullable jika login gagal (user belum tentu ada)
    email TEXT, -- Disimpan untuk tracking brute force by email
    action TEXT NOT NULL, -- 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'PASSWORD_CHANGE', 'SENSITIVE_ACCESS', 'CHALLENGE_SUCCESS', 'CHALLENGE_FAILED'
    ip_address TEXT, -- Hashed or partial for privacy if needed, but for security full IP is better usually
    user_agent TEXT,
    risk_level TEXT DEFAULT 'LOW', -- 'LOW', 'MEDIUM', 'HIGH'
    details JSONB DEFAULT '{}'::jsonb, -- Store device_id, page_url, etca
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing untuk performa query log login
CREATE INDEX IF NOT EXISTS idx_activity_email_created ON user_activity_logs(email, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_action ON user_activity_logs(action);

-- Enable RLS
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admin bisa baca semua
CREATE POLICY "admin_view_logs" ON user_activity_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid() AND (role = 'admin' OR 'admin' = ANY(roles))
        )
    );

-- User tidak bisa baca log orang lain (untuk privasi)
-- Inserter (Anon/Auth) bisa insert via RPC (Security Definer), jadi tidak perlu policy INSERT publik yang longgar

-- 2. TABEL: SUSPICIOUS ACCOUNTS
-- =====================================================
CREATE TABLE IF NOT EXISTS suspicious_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    risk_score INT DEFAULT 0, -- 0-100
    reasons JSONB DEFAULT '[]'::jsonb, -- Array of strings e.g. ["Too many login failures", "IP changed"]
    status TEXT DEFAULT 'MONITORING', -- 'MONITORING', 'WARNING', 'RESTRICTED', 'SUSPENDED'
    restriction_until TIMESTAMPTZ, -- Jika status RESTRICTED, sampai kapan?
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_suspicious_user UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE suspicious_accounts ENABLE ROW LEVEL SECURITY;

-- Admin Full Access
CREATE POLICY "admin_manage_suspicious" ON suspicious_accounts
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid() AND (role = 'admin' OR 'admin' = ANY(roles))
        )
    );

-- 3. RPC: LOG LOGIN (BRUTE FORCE PROTECTION)
-- =====================================================
-- Fungsi ini akan dipanggil dari Frontend setiap kali attempt login
CREATE OR REPLACE FUNCTION log_login_activity(
    p_email TEXT,
    p_status TEXT, -- 'SUCCESS' atau 'FAILED'
    p_ip TEXT,
    p_user_agent TEXT,
    p_device_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Wajib Security Definer agar Anon bisa insert log
AS $$
DECLARE
    v_fail_count INT;
    v_last_success TIMESTAMPTZ;
    v_is_restricted BOOLEAN := FALSE;
    v_restriction_end TIMESTAMPTZ;
BEGIN
    -- 1. Insert Log
    INSERT INTO user_activity_logs (email, action, ip_address, user_agent, details, risk_level)
    VALUES (
        p_email, 
        CASE WHEN p_status = 'SUCCESS' THEN 'LOGIN_SUCCESS' ELSE 'LOGIN_FAILED' END,
        p_ip, 
        p_user_agent, 
        jsonb_build_object('device_id', p_device_id),
        CASE WHEN p_status = 'FAILED' THEN 'MEDIUM' ELSE 'LOW' END
    );

    -- 2. Check Brute Force (Only if FAILED)
    IF p_status = 'FAILED' THEN
        -- Hitung kegagalan dalam 30 menit terakhir
        SELECT COUNT(*) INTO v_fail_count
        FROM user_activity_logs
        WHERE email = p_email 
          AND action = 'LOGIN_FAILED'
          AND created_at > (NOW() - INTERVAL '30 minutes');

        -- Jika > 5x, blokir sementara (Virtual Block, tidak disable user DB)
        IF v_fail_count >= 5 THEN
            -- Return info bahwa user harus diblokir
            RETURN jsonb_build_object(
                'blocked', true,
                'reason', 'Too many attempts',
                'cooldown_seconds', 1800 -- 30 menit
            );
        END IF;
    END IF;

    RETURN jsonb_build_object('blocked', false);
END;
$$;

-- Grant ANON access karena login page itu public
GRANT EXECUTE ON FUNCTION log_login_activity TO anon, authenticated;


-- 4. RPC: CHECK LOGIN RESTRICTION
-- =====================================================
-- Dipanggil sebelum user submit form login (onBlur email) atau saat submit
CREATE OR REPLACE FUNCTION check_login_restriction(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_fail_count INT;
    v_last_fail TIMESTAMPTZ;
    v_remaining_seconds INT;
BEGIN
    -- Cek kegagalan 30 menit terakhir
    SELECT COUNT(*), MAX(created_at) INTO v_fail_count, v_last_fail
    FROM user_activity_logs
    WHERE email = p_email 
      AND action = 'LOGIN_FAILED'
      AND created_at > (NOW() - INTERVAL '30 minutes');

    IF v_fail_count >= 5 THEN
        -- Hitung sisa waktu (30 menit dari failure terakhir)
        v_remaining_seconds := EXTRACT(EPOCH FROM (v_last_fail + INTERVAL '30 minutes') - NOW())::INT;
        
        IF v_remaining_seconds > 0 THEN
            RETURN jsonb_build_object(
                'restricted', true,
                'remaining_seconds', v_remaining_seconds,
                'message', 'Terlalu banyak percobaan login. Silakan tunggu ' || CEIL(v_remaining_seconds/60.0) || ' menit.'
            );
        END IF;
    END IF;

    RETURN jsonb_build_object('restricted', false);
END;
$$;

GRANT EXECUTE ON FUNCTION check_login_restriction TO anon, authenticated;


-- 5. RPC: REPORT SUSPICIOUS ACTIVITY
-- =====================================================
-- Dipanggil jika Frontend mendeteksi anomali (misal: akses halaman tanpa hak akses)
CREATE OR REPLACE FUNCTION report_suspicious_activity(
    p_user_id UUID,
    p_reason TEXT,
    p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_account_id UUID;
    v_current_score INT;
BEGIN
    -- 1. Log Activity
    INSERT INTO user_activity_logs (user_id, action, risk_level, details)
    VALUES (p_user_id, 'SUSPICIOUS_ACTIVITY', 'HIGH', p_details || jsonb_build_object('reason', p_reason));

    -- 2. Update/Insert Suspicious Account
    -- Cek apakah sudah ada rekornya
    SELECT id, risk_score INTO v_account_id, v_current_score
    FROM suspicious_accounts
    WHERE user_id = p_user_id;

    IF v_account_id IS NOT NULL THEN
        -- Update
        UPDATE suspicious_accounts
        SET 
            risk_score = risk_score + 10, -- Tambah score
            reasons = reasons || to_jsonb(p_reason), -- Append reason
            last_activity = NOW(),
            updated_at = NOW(),
            status = CASE 
                WHEN risk_score + 10 >= 50 THEN 'WARNING'
                WHEN risk_score + 10 >= 80 THEN 'RESTRICTED'
                ELSE status
            END
        WHERE id = v_account_id;
    ELSE
        -- Insert baru
        INSERT INTO suspicious_accounts (user_id, risk_score, reasons, status)
        VALUES (p_user_id, 10, jsonb_build_array(p_reason), 'MONITORING');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION report_suspicious_activity TO authenticated;
-- Not giving to anon to prevent spam reporting on random users


-- 6. RPC: VERIFY CHALLENGE (BISMILLAH)
-- =====================================================
CREATE OR REPLACE FUNCTION verify_security_challenge(
    p_user_id UUID,
    p_answer TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF LOWER(TRIM(p_answer)) = 'bismillah' THEN
        -- Log Sukses
        INSERT INTO user_activity_logs (user_id, action, risk_level, details)
        VALUES (p_user_id, 'CHALLENGE_SUCCESS', 'LOW', '{"type": "word_challenge"}');
        
        RETURN jsonb_build_object('success', true);
    ELSE
        -- Log Gagal & Naikkan Risk
        PERFORM report_suspicious_activity(p_user_id, 'Failed Security Challenge (Wrong Answer)', jsonb_build_object('answer', p_answer));
        
        RETURN jsonb_build_object('success', false, 'message', 'Jawaban salah.');
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION verify_security_challenge TO authenticated;

-- Selesai
SELECT 'SAFE UPDATE PHASE 3 COMPLETE: Security Tables & RPCs Ready' as status;
