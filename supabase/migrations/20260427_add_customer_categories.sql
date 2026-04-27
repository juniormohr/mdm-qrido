-- Adicionar categorias de interesse à tabela de clientes para o CRM Inteligente
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS interest_categories text[] DEFAULT '{}';
