-- Migration: Add customer_user_id to customers table to link auth user directly
-- Date: 2026-07-31

ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS customer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for fast lookup by customer_user_id
CREATE INDEX IF NOT EXISTS idx_customers_customer_user_id ON public.customers(customer_user_id);
