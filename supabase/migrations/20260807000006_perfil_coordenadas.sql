-- ============================================================
-- NAVIS COM VOCÊ · Migração 6: coordenadas no perfil de busca
--
-- Fim da cerca geográfica: cidade/bairro viraram texto livre e o
-- CEP passou a preencher endereço + coordenadas (BrasilAPI).
-- O perfil de busca guarda o ponto central do raio, para o
-- matching funcionar em qualquer cidade do Brasil.
-- ============================================================

alter table perfis_busca
  add column lat double precision,
  add column lng double precision;
