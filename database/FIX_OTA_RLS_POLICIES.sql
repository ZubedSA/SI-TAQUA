-- =====================================================
-- FIX OTA RLS POLICIES - Allow OTA Role to View Data
-- =====================================================
-- Problem: OTA users can only see data linked to their user_id,
-- but for dashboard they need to see summary data.
--
-- Solution: Add SELECT policies for role = 'ota' to view all data
-- =====================================================

-- 1. Drop existing restrictive OTA policies (if any)
DROP POLICY IF EXISTS "OTA View Own Profile" ON orang_tua_asuh;
DROP POLICY IF EXISTS "OTA View Own Santri Link" ON ota_santri;
DROP POLICY IF EXISTS "OTA View Own Pemasukan" ON ota_pemasukan;
DROP POLICY IF EXISTS "OTA View Own Pengeluaran" ON ota_pengeluaran;
DROP POLICY IF EXISTS "OTA Read orang_tua_asuh" ON orang_tua_asuh;
DROP POLICY IF EXISTS "OTA Read ota_santri" ON ota_santri;
DROP POLICY IF EXISTS "OTA Read ota_pemasukan" ON ota_pemasukan;
DROP POLICY IF EXISTS "OTA Read ota_pengeluaran" ON ota_pengeluaran;

-- 2. Create new READ policies for OTA role (can view all data)
-- This allows the dashboard to show summary statistics

-- orang_tua_asuh - OTA can read all active OTA profiles
CREATE POLICY "OTA Read orang_tua_asuh" ON orang_tua_asuh
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('ota', 'admin', 'bendahara')
    )
);

-- ota_santri - OTA can read all santri links
CREATE POLICY "OTA Read ota_santri" ON ota_santri
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('ota', 'admin', 'bendahara')
    )
);

-- ota_pemasukan - OTA can read all pemasukan (donations)
CREATE POLICY "OTA Read ota_pemasukan" ON ota_pemasukan
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('ota', 'admin', 'bendahara')
    )
);

-- ota_pengeluaran - OTA can read all pengeluaran (expenses)
CREATE POLICY "OTA Read ota_pengeluaran" ON ota_pengeluaran
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('ota', 'admin', 'bendahara')
    )
);

-- 3. Ensure ota_announcements is accessible to OTA role
DROP POLICY IF EXISTS "OTA Read Announcements" ON ota_announcements;
CREATE POLICY "OTA Read Announcements" ON ota_announcements
FOR SELECT USING (
    is_active = true AND
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('ota', 'admin')
    )
);

-- 4. If ota_kategori exists, add read policy
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ota_kategori') THEN
        -- Drop existing if any
        DROP POLICY IF EXISTS "OTA Read ota_kategori" ON ota_kategori;
        
        -- Create new policy
        EXECUTE 'CREATE POLICY "OTA Read ota_kategori" ON ota_kategori
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM user_profiles 
                WHERE user_id = auth.uid() 
                AND role IN (''ota'', ''admin'', ''bendahara'')
            )
        )';
    END IF;
END $$;

-- 5. Verify the policies
DO $$
BEGIN
    RAISE NOTICE 'OTA RLS Policies Updated Successfully!';
    RAISE NOTICE 'OTA users can now view dashboard data.';
END $$;
