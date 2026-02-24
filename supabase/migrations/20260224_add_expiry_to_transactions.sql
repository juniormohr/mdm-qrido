-- Add expiry date to loyalty transactions
-- Date: 2026-02-24

ALTER TABLE public.loyalty_transactions 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.loyalty_transactions.expires_at IS 'Data de validade dos pontos ganhos nesta transação';
