-- ============================================================
-- NAVIS COM VOCÊ · Migração 13: corrige a cascata de reversão do
-- trigger da migração 12
--
-- Bug real, achado pelo teste automatizado (não em produção): ao
-- concluir uma negociação, o trigger reverte corretamente as OUTRAS
-- negociações ativas do mesmo lead (o cliente já comprou, elas não
-- fazem mais sentido) — mas a reversão dessas outras, sozinha, não
-- sabia diferenciar "abandono explícito de uma negociação" (deveria
-- devolver o lead pra etapa 3, "Em contato", se não sobrar nenhuma)
-- de "reversão em cascata porque o lead ACABOU DE FECHAR em outro
-- imóvel" (o lead deve continuar na etapa 5, "Negócio Fechado" — não
-- regredir pra 3). O teste `teste-fluxos-cross-corretor.ts` pegou
-- isso antes de qualquer usuário real ver: "concluir uma negociação
-- reverte AUTOMATICAMENTE as outras negociações ativas do mesmo
-- lead" falhava com o lead voltando pra etapa 3 em vez de ficar em 5.
-- ============================================================

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
  v_tem_concluida boolean;
begin
  if old.status = new.status then
    return new;
  end if;

  select nome into v_corretor_nome from corretores where id = quem_mudou;

  if new.status = 'revertida' then
    -- lado do lead: só volta pra "Em contato" se não houver outra ativa NEM
    -- uma concluída (senão o lead já fechou em outro imóvel — fica em 5, não
    -- regride pra 3 só porque esta negociação específica foi desfeita)
    if new.lead_id is not null then
      select * into v_lead from leads where id = new.lead_id;
      v_outra_ativa := exists(
        select 1 from negociacoes where lead_id = new.lead_id and status = 'ativa' and id <> new.id
      );
      v_tem_concluida := exists(
        select 1 from negociacoes where lead_id = new.lead_id and status = 'concluida' and id <> new.id
      );
      if not v_outra_ativa and not v_tem_concluida and v_lead.etapa in (4, 5, 6) then
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
    -- com OUTROS imóveis deixam de fazer sentido. Este UPDATE dispara este
    -- mesmo trigger de novo pra cada uma (status ativa → revertida), que
    -- agora sabe (via v_tem_concluida acima) que o lead NÃO deve regredir
    -- pra etapa 3 — ele já está em 5, por causa desta conclusão.
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
