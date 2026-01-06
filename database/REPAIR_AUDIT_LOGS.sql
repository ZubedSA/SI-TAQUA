-- ==============================================================================
-- CRITICAL REPAIR: AUDIT LOG SYSTEM
-- ==============================================================================
-- This script repairs permissions, RLS, and forcefully re-applies triggers
-- to ensure NO ACTIVITY IS MISSED.

-- 1. Ensure Table Exists & Has Correct Permissions
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
    user_id UUID DEFAULT auth.uid(),
    user_role TEXT, -- Added this column (requested)
    action TEXT NOT NULL, 
    module TEXT, 
    target_table TEXT, 
    record_id TEXT,
    old_data JSONB,
    new_data JSONB,
    meta_data JSONB,
    request_method TEXT, -- Added this column (requested)
    status TEXT DEFAULT 'SUCCESS', -- Added this column (requested)
    ip_address TEXT, -- Added
    user_agent TEXT, -- Added
    severity TEXT DEFAULT 'INFO'
);

-- Force Permissions (Fix for "Data tidak masuk")
GRANT ALL ON public.audit_logs TO postgres, service_role, dashboard_user;
GRANT INSERT, SELECT ON public.audit_logs TO authenticated;
GRANT INSERT, SELECT ON public.audit_logs TO anon; -- Allow login failures to be logged

-- 2. Update RLS Policies (Make them permissive enough for logging)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT
    USING (public.is_admin_secure());

DROP POLICY IF EXISTS "System and Users can insert logs" ON public.audit_logs;
CREATE POLICY "System and Users can insert logs" ON public.audit_logs
    FOR INSERT
    WITH CHECK (true); -- Allow ANY insert (Auth/Anon) for logging purposes

DROP POLICY IF EXISTS "Audit logs are immutable" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit logs cannot be deleted" ON public.audit_logs;
-- (Re-apply immutability via check, but RLS deny is safer)
CREATE POLICY "Audit logs update deny" ON public.audit_logs FOR UPDATE USING (false);
CREATE POLICY "Audit logs delete deny" ON public.audit_logs FOR DELETE USING (false);


-- 3. Robust Trigger Function (Updated with new columns)
CREATE OR REPLACE FUNCTION public.trigger_auto_audit()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_role TEXT;
    v_action TEXT;
    v_module TEXT;
    v_record_id TEXT;
    v_old_data JSONB;
    v_new_data JSONB;
    v_op TEXT;
BEGIN
    v_user_id := auth.uid();
    -- Attempt to get role from jwt
    v_role := (current_setting('request.jwt.claims', true)::jsonb ->> 'role');
    v_op := TG_OP;

    -- Determine Action & Data
    IF (v_op = 'INSERT') THEN
        v_action := 'CREATE';
        v_new_data := to_jsonb(NEW);
        IF (to_jsonb(NEW) ? 'id') THEN v_record_id := (to_jsonb(NEW) ->> 'id'); END IF;
    ELSIF (v_op = 'UPDATE') THEN
        v_action := 'UPDATE';
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
        IF (to_jsonb(NEW) ? 'id') THEN v_record_id := (to_jsonb(NEW) ->> 'id'); END IF;
        
        -- Detect Soft Delete
        IF (v_old_data ? 'is_deleted' AND v_new_data ? 'is_deleted') THEN
            IF ((v_old_data ->> 'is_deleted')::boolean = false AND (v_new_data ->> 'is_deleted')::boolean = true) THEN
                v_action := 'DELETE (SOFT)';
            END IF;
        END IF;
    ELSIF (v_op = 'DELETE') THEN
        v_action := 'DELETE';
        v_old_data := to_jsonb(OLD);
        IF (to_jsonb(OLD) ? 'id') THEN v_record_id := (to_jsonb(OLD) ->> 'id'); END IF;
    END IF;

    -- Module Logic
    v_module := public.get_table_module_name(TG_TABLE_NAME);

    INSERT INTO public.audit_logs (
        timestamp,
        user_id,
        user_role,
        action,
        module,
        target_table,
        record_id,
        old_data,
        new_data,
        meta_data,
        action_source
    ) VALUES (
        now(),
        v_user_id,
        v_role,
        v_action,
        v_module,
        TG_TABLE_NAME,
        v_record_id,
        v_old_data,
        v_new_data,
        jsonb_build_object('source', 'DATABASE_TRIGGER', 'op', v_op),
        'DATABASE'
    );

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Frontend RPC (Secure & Robust)
CREATE OR REPLACE FUNCTION public.log_frontend_activity(
    p_action TEXT,
    p_module TEXT,
    p_details JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
DECLARE
    v_role TEXT;
BEGIN
    v_role := (current_setting('request.jwt.claims', true)::jsonb ->> 'role');

    INSERT INTO public.audit_logs (
        user_id,
        user_role,
        action,
        module,
        meta_data,
        action_source,
        status,
        user_agent
    ) VALUES (
        auth.uid(),
        v_role,
        p_action,
        p_module,
        p_details,
        'FRONTEND',
        'SUCCESS',
        (p_details ->> 'user_agent')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. FORCE RE-APPLY TRIGGERS (The Fix for "Empty Logs")
DO $$
DECLARE
    t text;
    verification_count int := 0;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          AND table_name != 'audit_logs' 
          AND table_name NOT LIKE 'pg_%'
          AND table_name NOT LIKE 'sql_%'
    LOOP
        -- Drop existing trigger to ensure update
        EXECUTE format('DROP TRIGGER IF EXISTS audit_trigger_%I ON public.%I', t, t);
        
        -- Create Trigger
        EXECUTE format('
            CREATE TRIGGER audit_trigger_%I
            AFTER INSERT OR UPDATE OR DELETE ON public.%I
            FOR EACH ROW EXECUTE FUNCTION public.trigger_auto_audit();',
            t, t
        );
        verification_count := verification_count + 1;
    END LOOP;
    
    RAISE NOTICE 'SUCCESS: Applied audit triggers to % tables.', verification_count;
END;
$$;
