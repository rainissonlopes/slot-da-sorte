-- Script SQL para Configurar Buckets de Armazenamento (Supabase Storage)

-- 1. Cria os buckets caso não existam
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('logos', 'logos', true),
  ('banners', 'banners', true),
  ('plataformas', 'plataformas', true),
  ('jogos', 'jogos', true)
ON CONFLICT (id) DO NOTHING;

-- Remove as políticas caso já existam para evitar conflitos na execução repetida
DROP POLICY IF EXISTS "Acesso de leitura publico para storage" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload para usuarios autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir update para usuarios autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir delete para usuarios autenticados" ON storage.objects;

-- 2. Habilita acesso de leitura público para qualquer visitante em todos os objetos dos novos buckets
CREATE POLICY "Acesso de leitura publico para storage" 
ON storage.objects FOR SELECT 
USING (bucket_id IN ('logos', 'banners', 'plataformas', 'jogos'));

-- 3. Habilita acesso de upload para administradores autenticados
CREATE POLICY "Permitir upload para usuarios autenticados" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id IN ('logos', 'banners', 'plataformas', 'jogos'));

-- 4. Habilita acesso de modificação para administradores autenticados
CREATE POLICY "Permitir update para usuarios autenticados" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id IN ('logos', 'banners', 'plataformas', 'jogos'))
WITH CHECK (bucket_id IN ('logos', 'banners', 'plataformas', 'jogos'));

-- 5. Habilita acesso de exclusão para administradores autenticados
CREATE POLICY "Permitir delete para usuarios autenticados" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id IN ('logos', 'banners', 'plataformas', 'jogos'));
