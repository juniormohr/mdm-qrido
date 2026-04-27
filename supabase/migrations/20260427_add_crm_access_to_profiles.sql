-- Adiciona a flag de acesso ao CRM na tabela de perfis
-- Permite que as empresas (role = 'company') contratem o CRM de forma independente
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS crm_access BOOLEAN DEFAULT FALSE;
