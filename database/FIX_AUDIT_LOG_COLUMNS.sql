-- ==============================================================================
-- FIX: ADD MISSING COLUMNS TO AUDIT_LOGS
-- ==============================================================================
-- The previous script used "CREATE TABLE IF NOT EXISTS" which does NOT 
-- add columns if the table already exists. 
-- We must use "ALTER TABLE" to force the schema update.

DO $$
BEGIN
    -- 1. Add 'user_role'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='user_role') THEN
        ALTER TABLE public.audit_logs ADD COLUMN user_role TEXT;
    END IF;

    -- 2. Add 'request_method'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='request_method') THEN
        ALTER TABLE public.audit_logs ADD COLUMN request_method TEXT;
    END IF;

    -- 3. Add 'status'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='status') THEN
        ALTER TABLE public.audit_logs ADD COLUMN status TEXT DEFAULT 'SUCCESS';
    END IF;

    -- 4. Add 'ip_address'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='ip_address') THEN
        ALTER TABLE public.audit_logs ADD COLUMN ip_address TEXT;
    END IF;

    -- 5. Add 'user_agent'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='user_agent') THEN
        ALTER TABLE public.audit_logs ADD COLUMN user_agent TEXT;
    END IF;

    -- 6. Add 'action_source' if missing (though unlikely)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='action_source') THEN
        ALTER TABLE public.audit_logs ADD COLUMN action_source TEXT DEFAULT 'SYSTEM';
    END IF;

    RAISE NOTICE 'SUCCESS: Audit Log Schema updated with missing columns.';
END;
$$;

-- Force Grant Permissions Again just to be safe
GRANT ALL ON public.audit_logs TO postgres, service_role, dashboard_user;
GRANT INSERT, SELECT ON public.audit_logs TO authenticated;
GRANT INSERT, SELECT ON public.audit_logs TO anon;
