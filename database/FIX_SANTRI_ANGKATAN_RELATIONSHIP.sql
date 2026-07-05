-- Fix missing relationship between santri and angkatan
-- Run this in Supabase SQL Editor

-- 1. Ensure the constraint exists explicitly
ALTER TABLE public.santri 
DROP CONSTRAINT IF EXISTS santri_angkatan_id_fkey;

ALTER TABLE public.santri
ADD CONSTRAINT santri_angkatan_id_fkey 
FOREIGN KEY (angkatan_id) 
REFERENCES public.angkatan(id)
ON DELETE SET NULL;

-- 2. Verify RLS (Row Level Security) on angkatan table
-- Ensure all authenticated users can at least read angkatan
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'angkatan' AND policyname = 'Enable read for all'
    ) THEN
        CREATE POLICY "Enable read for all" ON public.angkatan 
        FOR SELECT USING (true);
    END IF;
END $$;

-- 3. Notify PostgREST to refresh schema cache
-- (DDL automatically refreshes the cache in most Supabase setups)
NOTIFY pgrst, 'reload schema';
