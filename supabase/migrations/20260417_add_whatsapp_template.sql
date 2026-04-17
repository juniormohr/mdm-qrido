-- Adiciona whatsapp_template para lojas configurarem mensagens de zap personalizadas
ALTER TABLE public.loyalty_configs ADD COLUMN IF NOT EXISTS whatsapp_template TEXT DEFAULT 'Olá {nome}, vimos que você tem {pontos} pontos no nosso programa de fidelidade! 🎁';
