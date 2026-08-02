-- Adicionar colunas na tabela entity_campaigns
ALTER TABLE public.entity_campaigns 
ADD COLUMN IF NOT EXISTS reward_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS target_holding BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS target_group BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS target_store BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS target_customer BOOLEAN DEFAULT true;
