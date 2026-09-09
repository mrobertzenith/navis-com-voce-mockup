-- ============================================================
-- NAVIS COM VOCÊ · Migração 9: RLS Fase 4, passo 1 — notificações
-- só pro destinatário
--
-- Hoje qualquer corretor da equipe lê a notificação de qualquer outro
-- (política "equipe_le", genérica pra todas as tabelas desde a migração 3).
-- Notificação é sempre 1-pra-1 — não existe razão de negócio pra isso ser
-- lido pela equipe inteira, diferente de leads/imoveis (onde o match
-- cross-corretor exige leitura ampla). É o passo mais seguro e isolado da
-- Fase 4 — não toca em matching, não quebra nenhum fluxo cross-corretor
-- existente. Ver PLANO_ARQUITETURA_NEGOCIACOES_E_RLS.md §B.4.
--
-- INSERT continua liberado pra equipe toda: quem CRIA a notificação nunca é
-- o destinatário (A notifica B) — restringir o insert quebraria esse fluxo.
-- ============================================================

drop policy if exists "equipe_le" on notificacoes;
create policy "somente_destinatario_le" on notificacoes
  for select to authenticated
  using (destinatario_corretor_id = corretor_atual_id());

drop policy if exists "equipe_atualiza" on notificacoes;
create policy "somente_destinatario_atualiza" on notificacoes
  for update to authenticated
  using (destinatario_corretor_id = corretor_atual_id())
  with check (destinatario_corretor_id = corretor_atual_id());
