-- Permissões públicas de leitura para perfis e produtos

-- Permite que qualquer pessoa (incluindo usuários não logados/anon) consulte os perfis das empresas
CREATE POLICY "Allow public read access to company profiles" ON public.profiles
    FOR SELECT USING (role = 'company');

-- Permite que qualquer pessoa consulte os produtos
CREATE POLICY "Allow public read access to products" ON public.products
    FOR SELECT USING (true);
