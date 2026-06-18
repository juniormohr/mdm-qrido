-- Add company_type to profiles to distinguish between regular stores and malls/groups
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS company_type TEXT CHECK (company_type IN ('store', 'mall')) DEFAULT 'store';
