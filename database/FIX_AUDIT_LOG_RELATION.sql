-- ==============================================================================
-- FIX AUDIT LOG RELATIONSHIP
-- ==============================================================================
-- Problem: Frontend sends 400 error because implicit join 'user:user_id' fails.
-- Solution: Explicitly define FK between audit_logs.user_id and user_profiles.user_id
-- ==============================================================================

DO $$
BEGIN
    -- 1. Drop existing constraint if it exists (for safety/idempotency)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'audit_logs_user_id_fkey'
    ) THEN
        ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_user_id_fkey;
    END IF;

    -- 2. Add Foreign Key Constraint
    -- referencing public.user_profiles(user_id) which mirrors auth.users
    ALTER TABLE public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.user_profiles(user_id)
    ON DELETE SET NULL;

    RAISE NOTICE 'SUCCESS: Adjusted audit_logs foreign key relationship.';
END;
$$;
