-- Add type and reward_id to purchase_requests
-- Date: 2026-02-23

ALTER TABLE public.purchase_requests 
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('purchase', 'redeem')) DEFAULT 'purchase';

ALTER TABLE public.purchase_requests 
ADD COLUMN IF NOT EXISTS reward_id UUID REFERENCES public.rewards(id) ON DELETE SET NULL;
