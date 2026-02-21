-- Migration to add partnership fields and email to profiles
-- Date: 2026-02-21

-- 1. Add new columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS partnership_months INTEGER,
ADD COLUMN IF NOT EXISTS partnership_end_date TIMESTAMP WITH TIME ZONE;

-- 2. Update subscription_tier check constraint to include 'partnership'
-- Note: PostgreSQL doesn't allow direct modification of CHECK constraints easily without dropping/re-creating.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_subscription_tier_check 
CHECK (subscription_tier IN ('basic', 'pro', 'master', 'partnership'));

-- 3. Update handle_new_user_profile trigger function to capture email
CREATE OR REPLACE FUNCTION public.handle_new_user_profile() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, email, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'phone',
    new.email, -- auth.users has email column
    COALESCE(new.raw_user_meta_data->>'role', 'company')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Backfill existing profile emails from auth.users (if possible/needed in this environment)
-- In a real scenario: UPDATE public.profiles p SET email = u.email FROM auth.users u WHERE p.id = u.id AND p.email IS NULL;
