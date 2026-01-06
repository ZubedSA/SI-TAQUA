-- ==============================================================================
-- FINAL AUDIT SYSTEM DEPLOYMENT (CRITICAL FIX - V2)
-- ==============================================================================
-- Acting as: Principal Database Engineer
-- Objective: GLOBAL DATABASE AUDIT logging for ALL tables.
-- Fixes: "Column does not exist" error by using ALTER TABLE.
-- ==============================================================================

-- [STEP 1] ENSURE AUDIT TABLE STRUCTURE (STRICT MODE)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Force Add Columns (Idempotent)
DO $$
BEGIN
    -- Core Columns
    ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();
    ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'DB';
    ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS action TEXT;
    ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS table_name TEXT;
    ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS record_id TEXT;
    ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS old_data JSONB;
    ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS new_data JSONB;
    ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS meta_data JSONB;
    
    -- Compatibility Columns
    ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS module TEXT;
    ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS target_table TEXT;
    ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS action_source TEXT;

    -- Ensure 'action' is not null (careful if existing data contradicts, but for fresh install it's fine)
    -- ALTER TABLE public.audit_logs ALTER COLUMN action SET NOT NULL; 
END $$;

-- ENSURE PERMISSIONS (CRITICAL)
GRANT ALL ON public.audit_logs TO postgres, service_role, dashboard_user;
GRANT INSERT, SELECT ON public.audit_logs TO authenticated;
GRANT INSERT, SELECT ON public.audit_logs TO anon;

-- ENSURE RLS DOES NOT BLOCK INSERTION
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow All Inspect" ON public.audit_logs;
CREATE POLICY "Allow All Inspect" ON public.audit_logs FOR SELECT USING (true); 

DROP POLICY IF EXISTS "Allow All Insert" ON public.audit_logs;
CREATE POLICY "Allow All Insert" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- [STEP 2] MASTER TRIGGER FUNCTION (DATABASE LEVEL)
CREATE OR REPLACE FUNCTION public.log_database_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_action TEXT;
    v_table_name TEXT;
    v_record_id TEXT;
    v_old_data JSONB;
    v_new_data JSONB;
    v_source TEXT := 'DB';
BEGIN
    -- 1. Capture Context
    v_user_id := auth.uid();
    v_table_name := TG_TABLE_NAME;
    v_action := TG_OP; -- INSERT, UPDATE, DELETE

    -- 2. Capture Data based on Operation
    IF (TG_OP = 'INSERT') THEN
        v_new_data := to_jsonb(NEW);
        IF (to_jsonb(NEW) ? 'id') THEN v_record_id := (to_jsonb(NEW) ->> 'id'); END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
        IF (to_jsonb(NEW) ? 'id') THEN v_record_id := (to_jsonb(NEW) ->> 'id'); END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        v_old_data := to_jsonb(OLD);
        IF (to_jsonb(OLD) ? 'id') THEN v_record_id := (to_jsonb(OLD) ->> 'id'); END IF;
    END IF;

    -- 3. INSERT TO AUDIT LOG (Blind Insert - No Fail)
    INSERT INTO public.audit_logs (
        timestamp,
        user_id,
        source,
        action,
        table_name,
        target_table, -- Compatibility
        record_id,
        old_data,
        new_data,
        meta_data
    ) VALUES (
        now(),
        v_user_id,
        v_source,
        v_action,
        v_table_name,
        v_table_name, -- Compatibility
        v_record_id,
        v_old_data,
        v_new_data,
        jsonb_build_object('trigger_depth', pg_trigger_depth())
    );

    RETURN NULL; -- Result is ignored for AFTER triggers
EXCEPTION WHEN OTHERS THEN
    -- Fallback: Do not fail the transaction if logging fails, BUT print warning
    RAISE WARNING 'Audit Log Failed: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- [STEP 3] AUTO-DEPLOY TO ALL TABLES
DO $$
DECLARE
    t text;
    count int := 0;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          AND table_name != 'audit_logs' -- Don't audit the audit log itself
    LOOP
        -- 1. Drop existing trigger to avoid duplicates/errors
        EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_global ON public.%I', t);
        
        -- 2. Create Trigger
        EXECUTE format('
            CREATE TRIGGER trg_audit_global
            AFTER INSERT OR UPDATE OR DELETE ON public.%I
            FOR EACH ROW EXECUTE FUNCTION public.log_database_activity();',
            t, t
        );
        
        count := count + 1;
    END LOOP;
    
    RAISE NOTICE 'AUDIT SYSTEM ONLINE: Monitoring % tables.', count;
END;
$$;

-- [STEP 4] AUTH EVENT LOGGER (RPC)
CREATE OR REPLACE FUNCTION public.log_auth_event(
    p_action TEXT,
    p_details JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.audit_logs (
        user_id,
        source,
        action,
        table_name,
        meta_data
    ) VALUES (
        auth.uid(),
        'AUTH',
        p_action,
        'auth.users',
        p_details
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- [STEP 5] VERIFICATION
-- Explicit column insert to verify schema
INSERT INTO public.audit_logs (source, action, table_name, meta_data)
VALUES ('SYSTEM', 'INIT_AUDIT_SYSTEM_V2', 'system', '{"status": "OK"}'::jsonb);
