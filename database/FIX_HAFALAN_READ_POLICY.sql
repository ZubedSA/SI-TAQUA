-- Enable broader read access for hafalan table
-- This allows any authenticated user (admin, guru, musyrif, etc.) to VIEW all hafalan records
-- This is required for the "Rekap Hafalan" global filter feature

BEGIN;

-- Drop existing restricted select policies if any
DROP POLICY IF EXISTS "Enable read access for owners" ON public.hafalan;
DROP POLICY IF EXISTS "Enable read access for musyrif halaqoh" ON public.hafalan;
DROP POLICY IF EXISTS "Enable read access for guru" ON public.hafalan;
DROP POLICY IF EXISTS "Hafalan viewable by relevant roles" ON public.hafalan;

-- Create a new broad select policy
-- "Akun dan role apapun itu bisa melihat dan menyaksikan data rekap itu dari semua halaqoh"
CREATE POLICY "Enable global read access for authenticated users"
ON public.hafalan
FOR SELECT
TO authenticated
USING (true);

COMMIT;
