-- ============================================================
-- NAVIS COM VOCÊ · Migração 15: RLS de INSERT por dono
--
-- Achado de auditoria externa (Codex, 14/09/2026), confirmado por leitura
-- do código antes de corrigir: a migração 3 criou `equipe_insere`/
-- `equipe_atualiza` genéricas (qualquer corretor autenticado da equipe) e
-- migrações posteriores apertaram boa parte do UPDATE (leads/imoveis via
-- migração 11; negociacoes/vendas via migração 12), mas o INSERT de várias
-- tabelas com dono claro (`corretor_id`/`corretor_responsavel_id`) continuou
-- aberto pra qualquer um da equipe atribuir OUTRO corretor como dono.
--
-- Confirmado, antes de apertar, que nenhum caminho de escrita real precisa
-- disso: leads/imoveis/perfis_busca/pesos_score/preferencias_notificacao/
-- dismisses/interesses_posteriores/atividades/imoveis_perdidos são sempre
-- inseridos pelo próprio dono (useLeads.ts, useImoveis.ts, e os scripts de
-- teste, sempre com a sessão do corretor coincidindo com o dono do registro
-- que estão criando).
--
-- `vinculos` foi deixado de fora de propósito: um imóvel de A vinculado ao
-- cliente de B é escrita legítima de QUALQUER um dos dois lados (já testado
-- em teste-fluxos-cross-corretor.ts) — não tem "dono" único pra restringir.
--
-- `notificacoes` também foi deixada de fora de propósito: "notificar OUTRO
-- corretor" é o próprio propósito da tabela (E16/E17/E18/CNM duplicado
-- ainda são inseridos por quem NÃO é o destinatário) — leitura/update já
-- são só do destinatário (migração 9), que é a parte sensível de verdade.
-- ============================================================

-- leads/imoveis: só faltava o INSERT (UPDATE já é dono-ou-vínculo desde a
-- migração 11)
drop policy if exists "equipe_insere" on leads;
create policy "dono_insere" on leads
  for insert to authenticated
  with check (corretor_responsavel_id = corretor_atual_id());

drop policy if exists "equipe_insere" on imoveis;
create policy "dono_insere" on imoveis
  for insert to authenticated
  with check (corretor_responsavel_id = corretor_atual_id());

-- perfis_busca: sempre escrito junto com o lead, pelo mesmo corretor —
-- dono é indireto (via lead_id)
drop policy if exists "equipe_insere" on perfis_busca;
create policy "dono_do_lead_insere" on perfis_busca
  for insert to authenticated
  with check (
    exists (select 1 from leads l where l.id = perfis_busca.lead_id and l.corretor_responsavel_id = corretor_atual_id())
  );
drop policy if exists "equipe_atualiza" on perfis_busca;
create policy "dono_do_lead_atualiza" on perfis_busca
  for update to authenticated
  using (
    exists (select 1 from leads l where l.id = perfis_busca.lead_id and l.corretor_responsavel_id = corretor_atual_id())
  )
  with check (
    exists (select 1 from leads l where l.id = perfis_busca.lead_id and l.corretor_responsavel_id = corretor_atual_id())
  );

-- tabelas com corretor_id direto: dono só mexe no próprio registro
drop policy if exists "equipe_insere" on pesos_score;
drop policy if exists "equipe_atualiza" on pesos_score;
create policy "dono_insere" on pesos_score for insert to authenticated with check (corretor_id = corretor_atual_id());
create policy "dono_atualiza" on pesos_score for update to authenticated
  using (corretor_id = corretor_atual_id()) with check (corretor_id = corretor_atual_id());

drop policy if exists "equipe_insere" on preferencias_notificacao;
drop policy if exists "equipe_atualiza" on preferencias_notificacao;
create policy "dono_insere" on preferencias_notificacao for insert to authenticated with check (corretor_id = corretor_atual_id());
create policy "dono_atualiza" on preferencias_notificacao for update to authenticated
  using (corretor_id = corretor_atual_id()) with check (corretor_id = corretor_atual_id());

drop policy if exists "equipe_insere" on dismisses;
drop policy if exists "equipe_atualiza" on dismisses;
create policy "dono_insere" on dismisses for insert to authenticated with check (corretor_id = corretor_atual_id());
create policy "dono_atualiza" on dismisses for update to authenticated
  using (corretor_id = corretor_atual_id()) with check (corretor_id = corretor_atual_id());

drop policy if exists "equipe_insere" on interesses_posteriores;
drop policy if exists "equipe_atualiza" on interesses_posteriores;
create policy "dono_insere" on interesses_posteriores for insert to authenticated with check (corretor_id = corretor_atual_id());
create policy "dono_atualiza" on interesses_posteriores for update to authenticated
  using (corretor_id = corretor_atual_id()) with check (corretor_id = corretor_atual_id());

drop policy if exists "equipe_insere" on atividades;
drop policy if exists "equipe_atualiza" on atividades;
create policy "dono_insere" on atividades for insert to authenticated with check (corretor_id = corretor_atual_id());
-- atividades não tem update no app hoje (é um log de acontecimentos) — mantém
-- só leitura de equipe (já existente) e insert por dono

drop policy if exists "equipe_insere" on imoveis_perdidos;
drop policy if exists "equipe_atualiza" on imoveis_perdidos;
create policy "dono_insere" on imoveis_perdidos for insert to authenticated with check (corretor_id = corretor_atual_id());
create policy "dono_atualiza" on imoveis_perdidos for update to authenticated
  using (corretor_id = corretor_atual_id()) with check (corretor_id = corretor_atual_id());
