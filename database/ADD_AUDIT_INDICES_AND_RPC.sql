-- ==============================================================================
-- AUDIT LOG OPTIMIZATION & METADATA UTILITIES
-- ==============================================================================

-- 1. Add Indices for Performance (Requested)
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_table ON public.audit_logs(target_table);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
-- Timestamp index usually exists or is primary sort key, but adding explicitly is good practice
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);


-- 2. Helper RPC to get Distinct Metadata for Filters (Dynamic Frontend)
-- This avoids hardcoding dropdown options in the frontend
CREATE OR REPLACE FUNCTION public.get_audit_metadata()
RETURNS TABLE (
    actions text[],
    modules text[],
    tables text[]
) AS $$
DECLARE
    v_actions text[];
    v_modules text[];
    v_tables text[];
BEGIN
    SELECT ARRAY_AGG(DISTINCT action ORDER BY action) INTO v_actions FROM public.audit_logs;
    SELECT ARRAY_AGG(DISTINCT module ORDER BY module) INTO v_modules FROM public.audit_logs;
    SELECT ARRAY_AGG(DISTINCT target_table ORDER BY target_table) INTO v_tables FROM public.audit_logs;

    RETURN QUERY SELECT v_actions, v_modules, v_tables;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated users (admin logic handled in app or RLS usually, 
-- but metadata is generally safe to read if you have access to the page)
GRANT EXECUTE ON FUNCTION public.get_audit_metadata() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_audit_metadata() TO service_role;
