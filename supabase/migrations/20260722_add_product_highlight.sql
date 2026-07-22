-- Migração para adicionar colunas de destaque de produtos e controle de pontos em dobro por produto
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS highlight_active BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS highlight_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS double_points_active BOOLEAN DEFAULT true;
