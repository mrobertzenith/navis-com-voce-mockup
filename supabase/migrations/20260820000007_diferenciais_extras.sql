-- ============================================================
-- NAVIS COM VOCÊ · Migração 7: diferenciais livres e fim das fotos
--
-- Documento de usabilidade (Navis, ago/2026):
--  · diferenciais devem aceitar itens novos, criados pelo corretor;
--    não entram no matching (não há padrão comum entre corretores),
--    mas ficam visíveis no card do imóvel;
--  · o cadastro de fotos deixa de existir — nem opcional.
-- ============================================================

alter table imoveis
  add column diferenciais_extras text[] not null default '{}';

-- fotos deixam de existir no produto: remove a trava e a coluna
alter table imoveis drop constraint if exists fotos_somente_url;
drop function if exists public.fotos_sao_urls(text[]);
alter table imoveis drop column if exists fotos;
