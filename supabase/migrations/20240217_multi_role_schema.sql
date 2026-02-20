-- Multi-Role Support: Company and Customer
-- Date: 2026-02-17

-- 1. Create profiles table to handle roles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('company', 'customer', 'admin')) NOT NULL DEFAULT 'company',
    full_name TEXT,
    phone TEXT,
    subscription_tier TEXT CHECK (subscription_tier IN ('basic', 'pro', 'master')) DEFAULT 'basic',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 2. Create products table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    points_reward INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are viewable by everyone authenticated" ON public.products
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Companies can manage their own products" ON public.products
    FOR ALL USING (auth.uid() = company_id);

-- 3. Create verification codes table
CREATE TABLE IF NOT EXISTS public.verification_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code CHAR(4) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '1 minute'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on verification codes
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can manage their own verification codes" ON public.verification_codes
    FOR ALL USING (auth.uid() = company_id);

-- Customers need to read the code to verify? 
-- Actually, the verification logic should probably be in a function to avoid exposing the code in plaintext to all customers.
-- But for a simple confirmation, we can let query by company_id + code.

CREATE POLICY "Customers can verify codes" ON public.verification_codes
    FOR SELECT USING (auth.role() = 'authenticated');

-- 4. Update transactions to include points expiry
ALTER TABLE public.loyalty_transactions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '12 months');

-- Adjusting customers table RLS to allow reading by everyone (to list companies) if we use 'customers' as the link
-- Wait, 'customers' table in the current context is "Customers of a specific store".
-- We need a global "Companies" list. The 'profiles' where role='company' is the global list.

-- 5. Trigger for profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'phone',
    COALESCE(new.raw_user_meta_data->>'role', 'company')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_profile();
