-- CHECK SANTRI RLS
SELECT 
    policyname, 
    cmd,
    permissive,
    qual
FROM pg_policies 
WHERE tablename = 'santri';
