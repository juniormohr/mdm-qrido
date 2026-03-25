-- Adiciona a coluna cpf_cnpj na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT UNIQUE;

-- Atualiza a trigger para salvar o cpf_cnpj também
CREATE OR REPLACE FUNCTION public.handle_new_user_profile() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, email, role, cpf_cnpj)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'phone',
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'customer'),
    new.raw_user_meta_data->>'cpf_cnpj'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
