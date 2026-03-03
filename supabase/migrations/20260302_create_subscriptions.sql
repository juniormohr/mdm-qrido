-- Create subscriptions table and add stripe_customer_id to profiles
-- Date: 2026-03-02

-- 1. Add stripe_customer_id to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- 2. Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id TEXT PRIMARY KEY, -- Stripe Subscription ID
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL, -- active, trialing, canceled, past_due, incomplete, incomplete_expired, unpaid
    plan TEXT NOT NULL, -- start, pro, master
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Users can read their own subscriptions
CREATE POLICY "Users can view own subscription" 
ON public.subscriptions FOR SELECT 
USING (auth.uid() = user_id);

-- Service role can do everything (needed for webhooks)
-- (Implicitly granted to service role)

-- 5. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();
