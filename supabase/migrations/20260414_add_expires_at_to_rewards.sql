-- Adiciona a coluna expires_at na tabela rewards que estava faltando no schema original
ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
