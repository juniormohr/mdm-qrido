-- Cria asaas_customer_id na tabela profiles
-- Date: 2026-04-23

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
