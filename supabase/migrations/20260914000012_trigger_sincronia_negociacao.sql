-- ============================================================
-- NAVIS COM VOCÊ · Migração 12: sincronia lead↔imóvel centralizada
-- no banco, substituindo a lógica de "quando um card muda, sincroniza
-- o vinculado e notifica" que estava reescrita à mão em 8 pontos
-- espalhados por MeusClientesPage.tsx/MeusImoveisPage.tsx/
-- NotificacoesPage.tsx (ver PLANO_TRIGGER_SINCRONIA_NEGOCIACAO.md).
--
-- Decisão de produto já fechada com o PO (14/09/2026): a negociação
-- sempre começa pelo lado do cliente; o corretor do imóvel só
-- aprova a entrada (quando o imóvel não é dele) e informa o valor
-- pra confirmar a venda, depois que o cliente já fechou. O trigger
-- abaixo é a fonte única de verdade sobre "quando negociacoes muda,
-- o que mais precisa mudar" — vale pra qualquer caminho de escrita
-- (as duas telas de hoje, ou qualquer tela futura), não precisa ser
-- lembrado de novo a cada lugar novo que mexer em negociacoes.
--
-- As funções são SECURITY DEFINER de propósito: a propagação para
-- leads/imoveis de OUTRO corretor não pode depender de RLS permitir
-- a escrita direta (às vezes não permite — e nem deveria, fora deste
-- mecanismo). corretor_atual_id() continua correto dentro de uma
-- função SECURITY DEFINER (lê o JWT da sessão, não muda com o
-- contexto de privilégio) — mesmo padrão já usado por eh_da_equipe()
-- e eh_admin(). Os triggers de restrição por coluna da migração 11
-- (restringe_update_lead_cross_corretor/imovel) continuam valendo
-- por cima disso — o que este trigger propaga (etapa, flags,
-- pendências) é exatamente o que aquelas colunas já permitem.
-- ============================================================

-- garante negociacao_id único em vendas — necessário pro
-- "on conflict" do trigger de conclusão não duplicar venda se uma
-- negociação for reaberta e concluída de novo
create unique index if not exists idx_vendas_negociacao_unica on vendas (negociacao_id);

-- ---------- 1. INSERT: negociação nova sempre nasce 'ativa' ----------

create or replace function propaga_criacao_negociacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  quem_criou uuid := corretor_atual_id();
  v_lead_codigo text;
  v_lead_corretor_nome text;
  v_imovel_endereco text;
begin
  if new.corretor_imovel_id = quem_criou then
    -- quem criou é dono do imóvel (mesmo corretor dos dois lados) — avança direto
    update imoveis set etapa = 'e', em_negociacao_flag = true
      where id = new.imovel_id and etapa <> 'e';
  elsif new.lead_id is not null then
    -- negociação cross-corretor: imóvel fica pendente de aprovação do dono
    update leads
      set pendente_aprovacao_imoveis = array_append(pendente_aprovacao_imoveis, new.imovel_id)
      where id = new.lead_id and not (new.imovel_id = any(pendente_aprovacao_imoveis));

    select l.codigo, c.nome into v_lead_codigo, v_lead_corretor_nome
      from leads l join corretores c on c.id = l.corretor_responsavel_id
      where l.id = new.lead_id;
    select endereco_rua || ', ' || endereco_numero into v_imovel_endereco
      from imoveis where id = new.imovel_id;

    insert into notificacoes (destinatario_corretor_id, tipo_evento, titulo, corpo, acao_pendente)
    values (
      new.corretor_imovel_id,
      'E16',
      'Aprovação pendente',
      format('"%s" (de %s) quer negociar seu imóvel "%s". Aprove para confirmar a negociação.',
        v_lead_codigo, v_lead_corretor_nome, v_imovel_endereco),
      jsonb_build_object('leadId', new.lead_id, 'imovelId', new.imovel_id)
    );
  end if;

  if new.corretor_cliente_id = quem_criou and new.lead_id is not null then
    update leads set etapa = 4 where id = new.lead_id and etapa < 4;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_propaga_criacao_negociacao on negociacoes;
create trigger trg_propaga_criacao_negociacao
  after insert on negociacoes
  for each row execute function propaga_criacao_negociacao();

-- ---------- 2. UPDATE OF status: revertida / concluida / reaberta ----------

create or replace function propaga_mudanca_status_negociacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  quem_mudou uuid := corretor_atual_id();
  v_lead leads%rowtype;
  v_imovel imoveis%rowtype;
  v_corretor_nome text;
  v_imovel_endereco text;
  v_outra_ativa boolean;
begin
  if old.status = new.status then
    return new;
  end if;

  select nome into v_corretor_nome from corretores where id = quem_mudou;

  if new.status = 'revertida' then
    -- lado do lead: só volta pra "Em contato" se não houver outra ativa
    if new.lead_id is not null then
      select * into v_lead from leads where id = new.lead_id;
      v_outra_ativa := exists(
        select 1 from negociacoes where lead_id = new.lead_id and status = 'ativa' and id <> new.id
      );
      if not v_outra_ativa and v_lead.etapa in (4, 5, 6) then
        update leads
          set etapa = 3, pendente_aprovacao_imoveis = array_remove(pendente_aprovacao_imoveis, new.imovel_id)
          where id = new.lead_id;
        if v_lead.corretor_responsavel_id <> quem_mudou then
          select endereco_rua || ', ' || endereco_numero into v_imovel_endereco from imoveis where id = new.imovel_id;
          insert into notificacoes (destinatario_corretor_id, tipo_evento, titulo, corpo)
          values (
            v_lead.corretor_responsavel_id, 'E17', 'Cliente movido automaticamente',
            format('%s tirou o imóvel "%s" de negociação — seu cliente "%s" voltou para "Em contato".',
              v_corretor_nome, v_imovel_endereco, v_lead.codigo)
          );
        end if;
      else
        update leads set pendente_aprovacao_imoveis = array_remove(pendente_aprovacao_imoveis, new.imovel_id)
          where id = new.lead_id;
      end if;
    end if;

    -- lado do imóvel: só volta pra "Publicado" se não houver outra ativa/concluida
    select * into v_imovel from imoveis where id = new.imovel_id;
    v_outra_ativa := exists(
      select 1 from negociacoes
      where imovel_id = new.imovel_id and status in ('ativa', 'concluida') and id <> new.id
    );
    if not v_outra_ativa and v_imovel.etapa = 'e' then
      update imoveis set etapa = 'd', em_negociacao_flag = false where id = new.imovel_id;
      if v_imovel.corretor_responsavel_id <> quem_mudou then
        insert into notificacoes (destinatario_corretor_id, tipo_evento, titulo, corpo)
        values (
          v_imovel.corretor_responsavel_id, 'E17', 'Imóvel movido automaticamente',
          format('%s reverteu a negociação — seu imóvel "%s" voltou para "Publicado".',
            v_corretor_nome, v_imovel.endereco_rua || ', ' || v_imovel.endereco_numero)
        );
      end if;
    end if;

    -- venda ligada (se a negociação já tinha sido concluída antes) some junto
    update vendas set revertida = true, justificativa_reversao = 'Negociação revertida'
      where negociacao_id = new.id and revertida = false;
  end if;

  if new.status = 'concluida' then
    select * into v_lead from leads where id = new.lead_id;

    update leads set etapa = 5 where id = new.lead_id and etapa <> 5;
    if v_lead.corretor_responsavel_id <> quem_mudou then
      select endereco_rua || ', ' || endereco_numero into v_imovel_endereco from imoveis where id = new.imovel_id;
      insert into notificacoes (destinatario_corretor_id, tipo_evento, titulo, corpo)
      values (
        v_lead.corretor_responsavel_id, 'E17', 'Venda confirmada',
        format('%s confirmou a venda do imóvel "%s" — seu cliente "%s" está em "Negócio Fechado".',
          v_corretor_nome, v_imovel_endereco, v_lead.codigo)
      );
    end if;

    update imoveis set etapa = 'f', data_venda = now() where id = new.imovel_id and etapa <> 'f';

    insert into vendas (
      negociacao_id, imovel_id, lead_id, corretor_imovel_id, corretor_cliente_id,
      valor_venda, data_venda, revertida
    )
    values (
      new.id, new.imovel_id, new.lead_id, new.corretor_imovel_id, new.corretor_cliente_id,
      coalesce(new.valor_negociado, 0), now(), false
    )
    on conflict (negociacao_id) do update
      set revertida = false, valor_venda = excluded.valor_venda, data_venda = excluded.data_venda;

    -- o cliente já comprou este imóvel — as outras negociações ativas dele
    -- com OUTROS imóveis deixam de fazer sentido (bug real do TESTES 05
    -- item 1: ficavam órfãs, sem ninguém desfazendo). Este UPDATE dispara
    -- este mesmo trigger de novo pra cada uma (status ativa → revertida),
    -- que cuida do lado do imóvel de cada uma sozinho.
    update negociacoes set status = 'revertida', data_fim = now()
      where lead_id = new.lead_id and id <> new.id and status = 'ativa';
  end if;

  if new.status = 'ativa' and old.status in ('revertida', 'concluida') then
    if new.lead_id is not null then
      update leads set etapa = 4 where id = new.lead_id and etapa <> 4;
    end if;
    update imoveis set etapa = 'e', em_negociacao_flag = true where id = new.imovel_id and etapa <> 'e';
    update vendas set revertida = true, justificativa_reversao = 'Reaberta pelo corretor'
      where negociacao_id = new.id and revertida = false;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_propaga_mudanca_status_negociacao on negociacoes;
create trigger trg_propaga_mudanca_status_negociacao
  after update of status on negociacoes
  for each row execute function propaga_mudanca_status_negociacao();

-- ---------- 3. INSERT em negociacoes/vendas: só quem participa ----------
-- Achado na análise arquitetural (14/09/2026): equipe_insere permitia
-- qualquer corretor da equipe criar uma negociação atribuindo QUALQUER
-- outro corretor como corretor_imovel_id/corretor_cliente_id, sem nenhuma
-- relação real com a operação. UPDATE já tinha sido travado na migração 11
-- (participante_atualiza) — faltava o INSERT.

drop policy if exists "equipe_insere" on negociacoes;
create policy "participante_insere" on negociacoes
  for insert to authenticated
  with check (corretor_atual_id() in (corretor_imovel_id, corretor_cliente_id));

drop policy if exists "equipe_insere" on vendas;
create policy "participante_insere" on vendas
  for insert to authenticated
  with check (corretor_atual_id() in (corretor_imovel_id, corretor_cliente_id));
