-- Migration: Fix profiles_role_check constraint to include 'company_staff'
-- Date: 2026-08-14

DO $$ 
BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('company', 'customer', 'admin', 'holding', 'company_staff'));
END $$;
