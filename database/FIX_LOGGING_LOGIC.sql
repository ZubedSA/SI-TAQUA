-- =====================================================
-- FIX: UPDATE LOGGING LOGIC FOR SUSPICIOUS ACCOUNTS
-- =====================================================
-- Masalah: 'Suspicious Accounts' page kosong vaikka ada brute force block.
-- Penyebab: RPC 'log_login_activity' tidak insert ke tabel 'suspicious_accounts'.
-- Solusi: Panggil logic report suspicious saat terdeteksi blocked.

CREATE OR REPLACE FUNCTION log_login_activity(
    p_email TEXT,
    p_status TEXT, -- 'SUCCESS' atau 'FAILED'
    p_ip TEXT,
    p_user_agent TEXT,
    p_device_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_fail_count INT;
    v_user_id UUID;
    v_account_id UUID;
    v_exists_suspicious BOOLEAN;
BEGIN
    -- 0. Cari User ID dari Email (jika ada)
    -- Ini penting agar kita bisa link ke tabel suspicious_accounts (yang butuh user_id)
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;

    -- 1. Insert Log
    INSERT INTO user_activity_logs (user_id, email, action, ip_address, user_agent, details, risk_level)
    VALUES (
        v_user_id, -- Masukkan ID jika ketemu
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

        -- Jika > 5x, blokir sementara DAN lapor ke suspicious_accounts
        IF v_fail_count >= 5 THEN
            
            -- REPORT SUSPICIOUS ACTIVITY (AUTO)
            -- Hanya jika user_id diketahui (jika email tidak terdaftar, user_id null, tidak bisa masuk suspicious_accounts yg butuh FK)
            IF v_user_id IS NOT NULL THEN
                
                -- Upsert ke suspicious_accounts
                INSERT INTO suspicious_accounts (user_id, risk_score, reasons, status, restriction_until)
                VALUES (
                    v_user_id, 
                    50, -- Langsung score tinggi
                    jsonb_build_array('Brute force detected (5+ failed logins)'), 
                    'RESTRICTED',
                    NOW() + INTERVAL '30 minutes'
                )
                ON CONFLICT (user_id) DO UPDATE SET
                    risk_score = suspicious_accounts.risk_score + 10,
                    reasons = suspicious_accounts.reasons || '"Brute force detected (recent)"'::jsonb,
                    last_activity = NOW(),
                    status = 'RESTRICTED',
                    restriction_until = NOW() + INTERVAL '30 minutes';
                    
            END IF;

            -- Return info user harus diblokir
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

SELECT 'FIX COMPLETE: log_login_activity now populates suspicious_accounts' as status;
