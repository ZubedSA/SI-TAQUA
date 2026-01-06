-- =========================================================================
-- CREATE_MISSING_LOG_RPC.sql
-- Memperbaiki Error 404: function log_login_activity not found
-- =========================================================================

BEGIN;

-- 1. Pastikan tabel audit_logs ada
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    email TEXT,
    action TEXT NOT NULL,
    status TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Buat Function log_login_activity
CREATE OR REPLACE FUNCTION public.log_login_activity(
    p_email TEXT,
    p_status TEXT,
    p_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Penting: agar bisa insert ke audit log tanpa RLS user
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Coba cari user_id dari email (jika ada)
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;

    INSERT INTO public.audit_logs (
        user_id,
        email,
        action,
        status,
        details
    ) VALUES (
        v_user_id,
        p_email,
        'LOGIN_ATTEMPT',
        p_status,
        jsonb_build_object('message', p_message)
    );
EXCEPTION WHEN OTHERS THEN
    -- Jangan sampai error logging mengganggu login utama
    RAISE WARNING 'Log activity failed: %', SQLERRM;
END;
$$;

-- 3. Grant Permissions
GRANT INSERT, SELECT ON public.audit_logs TO authenticated;
GRANT INSERT, SELECT ON public.audit_logs TO anon;
GRANT INSERT, SELECT ON public.audit_logs TO service_role;

GRANT EXECUTE ON FUNCTION public.log_login_activity(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_login_activity(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.log_login_activity(TEXT, TEXT, TEXT) TO service_role;

COMMIT;

SELECT '✅ RPC log_login_activity BERHASIL DIBUAT.' as status;
