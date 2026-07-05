-- ==============================================================================
-- AUTOMATED FUTURE-PROOF AUDIT LOGGING SYSTEM
-- ==============================================================================

-- 1. Create Audit Table (Immutable Log)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
    user_id UUID DEFAULT auth.uid(), -- Auto-capture current user
    action TEXT NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, PAGE_VIEW
    module TEXT, -- Derived from Table Name or Route
    target_table TEXT, 
    record_id TEXT,
    old_data JSONB,
    new_data JSONB,
    meta_data JSONB, -- IP, User-Agent, etc.
    severity TEXT DEFAULT 'INFO' -- INFO, WARNING, CRITICAL
);

-- Security: Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Security: Policy (Read: Admins Only)
-- Assuming is_admin_secure() exists from previous security fixes
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT
    USING (public.is_admin_secure());

-- Security: Policy (Insert: System & Auth Users for Frontend Logs)
CREATE POLICY "System and Users can insert logs" ON public.audit_logs
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL); -- Only authenticated users can log frontend events

-- Security: Prevent Updates/Deletes (True Audit Log)
CREATE POLICY "Audit logs are immutable" ON public.audit_logs
    FOR UPDATE USING (false);

CREATE POLICY "Audit logs cannot be deleted" ON public.audit_logs
    FOR DELETE USING (false);


-- 2. Generic Information Extractor Function
CREATE OR REPLACE FUNCTION public.get_table_module_name(table_name TEXT) 
RETURNS TEXT AS $$
BEGIN
    -- Simple mapping logic, can be expanded
    IF table_name LIKE 'kas_%' OR table_name LIKE 'pembayaran%' OR table_name LIKE 'tagihan%' THEN
        RETURN 'KEUANGAN';
    ELSIF table_name LIKE 'santri%' OR table_name LIKE 'kelas%' THEN
        RETURN 'AKADEMIK';
    ELSIF table_name = 'user_profiles' THEN
        RETURN 'USER_MANAGEMENT';
    ELSE
        RETURN 'GENERAL';
    END IF;
END;
$$ LANGUAGE plpgsql;


-- 3. The Generic Trigger Function (The "Brain")
CREATE OR REPLACE FUNCTION public.trigger_auto_audit()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_action TEXT;
    v_module TEXT;
    v_record_id TEXT;
    v_old_data JSONB;
    v_new_data JSONB;
BEGIN
    -- Get Current User
    v_user_id := auth.uid();
    
    -- Determine Action
    IF (TG_OP = 'INSERT') THEN
        v_action := 'CREATE';
        v_new_data := to_jsonb(NEW);
        -- Try to find ID
        IF (to_jsonb(NEW) ? 'id') THEN
            v_record_id := (to_jsonb(NEW) ->> 'id');
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_action := 'UPDATE';
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
        IF (to_jsonb(NEW) ? 'id') THEN
            v_record_id := (to_jsonb(NEW) ->> 'id');
        END IF;
        
        -- Special Case: Soft Delete (if is_deleted changes)
        IF (v_old_data ? 'is_deleted' AND v_new_data ? 'is_deleted') THEN
            IF ((v_old_data ->> 'is_deleted')::boolean = false AND (v_new_data ->> 'is_deleted')::boolean = true) THEN
                v_action := 'DELETE (SOFT)';
            END IF;
        END IF;

    ELSIF (TG_OP = 'DELETE') THEN
        v_action := 'DELETE';
        v_old_data := to_jsonb(OLD);
        IF (to_jsonb(OLD) ? 'id') THEN
            v_record_id := (to_jsonb(OLD) ->> 'id');
        END IF;
    END IF;

    -- Determine Module
    v_module := public.get_table_module_name(TG_TABLE_NAME);

    -- Insert Log
    INSERT INTO public.audit_logs (
        timestamp,
        user_id,
        action,
        module,
        target_table,
        record_id,
        old_data,
        new_data,
        meta_data
    ) VALUES (
        now(),
        v_user_id,
        v_action,
        v_module,
        TG_TABLE_NAME,
        v_record_id,
        v_old_data,
        v_new_data,
        jsonb_build_object('source', 'DATABASE_TRIGGER', 'op', TG_OP)
    );

    RETURN NULL; -- Result is ignored for AFTER triggers
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Frontend Helper RPC (Secure Log Entry)
CREATE OR REPLACE FUNCTION public.log_frontend_activity(
    p_action TEXT,
    p_module TEXT,
    p_details JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.audit_logs (
        user_id,
        action,
        module,
        meta_data
    ) VALUES (
        auth.uid(),
        p_action,
        p_module,
        p_details || jsonb_build_object('source', 'FRONTEND')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. Auto-Apply to ALL Existing Tables (The "Future Proof" Start)
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          AND table_name != 'audit_logs' -- Don't audit the audit log!
          AND table_name NOT LIKE 'pg_%'
          AND table_name NOT LIKE 'sql_%'
    LOOP
        -- Check if trigger exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE event_object_table = t 
            AND trigger_name = 'audit_trigger_' || t
        ) THEN
            EXECUTE format('
                CREATE TRIGGER audit_trigger_%I
                AFTER INSERT OR UPDATE OR DELETE ON public.%I
                FOR EACH ROW EXECUTE FUNCTION public.trigger_auto_audit();',
                t, t
            );
            RAISE NOTICE 'Added audit trigger to table: %', t;
        END IF;
    END LOOP;
END;
$$;
