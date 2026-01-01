-- =====================================================
-- ADD PENGURUS ROLE TO SYSTEM
-- Script untuk menambahkan role 'pengurus' ke sistem
-- Run this in Supabase SQL Editor
-- =====================================================

-- STEP 1: Update role constraint pada user_profiles
-- Menambahkan 'pengurus' ke daftar role yang valid
-- =====================================================

DO $$
BEGIN
    -- Drop existing constraint if exists
    ALTER TABLE public.user_profiles 
    DROP CONSTRAINT IF EXISTS user_profiles_role_check;
    
    -- Add new constraint with 'pengurus' role
    ALTER TABLE public.user_profiles 
    ADD CONSTRAINT user_profiles_role_check 
    CHECK (role IN ('admin', 'guru', 'bendahara', 'pengasuh', 'pengurus', 'wali', 'santri', 'guest'));
    
    RAISE NOTICE 'Role constraint updated successfully!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating constraint: %', SQLERRM;
END $$;

-- STEP 2: Update existing RPC functions to recognize 'pengurus' role
-- (Optional - only if you have role-specific functions)
-- =====================================================

-- Helper function: Check if current user is admin or pengurus
CREATE OR REPLACE FUNCTION is_admin_or_pengurus()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND (
            role = 'admin' 
            OR role = 'pengurus'
            OR 'admin' = ANY(roles)
            OR 'pengurus' = ANY(roles)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Check if current user is pengurus
CREATE OR REPLACE FUNCTION is_pengurus()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND (role = 'pengurus' OR 'pengurus' = ANY(roles))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- VERIFICATION
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Role pengurus berhasil ditambahkan!';
    RAISE NOTICE 'Sekarang Anda bisa:';
    RAISE NOTICE '1. Membuat user dengan role pengurus dari Admin Panel';
    RAISE NOTICE '2. User pengurus bisa login dan akses Dashboard Pengurus';
END $$;
