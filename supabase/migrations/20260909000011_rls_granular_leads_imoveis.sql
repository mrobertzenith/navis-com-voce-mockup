-- ============================================================
-- NAVIS COM VOCÊ · Migração 11: RLS granular de leads/imóveis +
-- separação de dado sensível de cliente
--
-- Decisão do PO (09/09/2026, ver PLANO_ARQUITETURA_NEGOCIACOES_E_RLS.md
-- §B.6-B.9):
-- - Equipe toda continua lendo dado de match (nome, endereço, tipo, valor,
--   etapa) — não muda.
-- - Contato (e-mail, telefone) e observações do cliente NUNCA cruzam pra
--   outro corretor, nem com negociação/vínculo formal — só quem cadastrou
--   o lead. RLS não filtra COLUNA, só LINHA — então o dado sai fisicamente
--   de `leads` pra uma tabela própria com política restritiva de verdade.
-- - Nenhum corretor altera registro de outro, EXCETO etapa/flags de funil,
--   nos dois sentidos, quando existe negociação real ligando os dois lados
--   (mover imóvel move cliente vinculado e vice-versa — já é o
--   comportamento do app hoje; isso só torna real no banco, não só na tela).
-- - Valor de venda é do imóvel: só o corretor do imóvel preenche.
-- ============================================================

-- ---------- 1. leads_contato: dado sensível, separado, RLS restritiva ----------

create table leads_contato (
  lead_id uuid primary key references leads (id) on delete cascade,
  email text,
  telefone_whatsapp text,
  observacoes text,
  origem origem_lead,
  descricao_origem text,
  motivo_standby text,
  me_mantenha_informado boolean,
  motivo_perdido text,
  data_entrada_standby timestamptz
);

alter table leads_contato enable row level security;

create policy "somente_dono_le" on leads_contato
  for select to authenticated
  using (
    exists (
      select 1 from leads l
      where l.id = leads_contato.lead_id and l.corretor_responsavel_id = corretor_atual_id()
    )
  );

create policy "somente_dono_insere" on leads_contato
  for insert to authenticated
  with check (
    exists (
      select 1 from leads l
      where l.id = leads_contato.lead_id and l.corretor_responsavel_id = corretor_atual_id()
    )
  );

create policy "somente_dono_atualiza" on leads_contato
  for update to authenticated
  using (
    exists (
      select 1 from leads l
      where l.id = leads_contato.lead_id and l.corretor_responsavel_id = corretor_atual_id()
    )
  )
  with check (
    exists (
      select 1 from leads l
      where l.id = leads_contato.lead_id and l.corretor_responsavel_id = corretor_atual_id()
    )
  );

-- migra o dado existente
insert into leads_contato (
  lead_id, email, telefone_whatsapp, observacoes, origem, descricao_origem,
  motivo_standby, me_mantenha_informado, motivo_perdido, data_entrada_standby
)
select
  id, email, telefone_whatsapp, observacoes, origem, descricao_origem,
  motivo_standby, me_mantenha_informado, motivo_perdido, data_entrada_standby
from leads;

-- fecha o buraco de verdade: sai fisicamente de leads, não só de uso
alter table leads
  drop column email,
  drop column telefone_whatsapp,
  drop column observacoes,
  drop column origem,
  drop column descricao_origem,
  drop column motivo_standby,
  drop column me_mantenha_informado,
  drop column motivo_perdido,
  drop column data_entrada_standby;

-- ---------- 2. leads: dono OU corretor vinculado por negociação pode
--    tentar o UPDATE; o trigger decide o que de fato passa ----------

drop policy if exists "equipe_atualiza" on leads;
create policy "dono_ou_vinculo_atualiza" on leads
  for update to authenticated
  using (
    corretor_responsavel_id = corretor_atual_id()
    or exists (
      select 1 from negociacoes n
      where n.lead_id = leads.id and n.corretor_imovel_id = corretor_atual_id()
    )
  )
  with check (true); -- a validação de coluna é o trigger abaixo, não a policy

create or replace function restringe_update_lead_cross_corretor()
returns trigger
language plpgsql
as $$
begin
  if old.corretor_responsavel_id = corretor_atual_id() then
    return new; -- dono altera o que quiser
  end if;
  -- não-dono só chegou aqui via vínculo de negociação (a policy já garantiu)
  -- e só pode mexer em etapa/pendencias de funil — nada de dado do dono
  if new.nome is distinct from old.nome
    or new.codigo is distinct from old.codigo
    or new.corretor_responsavel_id is distinct from old.corretor_responsavel_id
    or new.data_cadastro is distinct from old.data_cadastro
    or new.visitas_agendadas is distinct from old.visitas_agendadas
  then
    raise exception 'corretor % só pode alterar etapa/pendências de lead de outro corretor', corretor_atual_id();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_restringe_update_lead_cross_corretor on leads;
create trigger trg_restringe_update_lead_cross_corretor
  before update on leads
  for each row execute function restringe_update_lead_cross_corretor();

-- ---------- 3. imoveis: mesma lógica, espelhada ----------

drop policy if exists "equipe_atualiza" on imoveis;
create policy "dono_ou_vinculo_atualiza" on imoveis
  for update to authenticated
  using (
    corretor_responsavel_id = corretor_atual_id()
    or exists (
      select 1 from negociacoes n
      where n.imovel_id = imoveis.id and n.corretor_cliente_id = corretor_atual_id()
    )
  )
  with check (true);

create or replace function restringe_update_imovel_cross_corretor()
returns trigger
language plpgsql
as $$
begin
  if old.corretor_responsavel_id = corretor_atual_id() then
    return new;
  end if;
  -- não-dono (corretor do cliente vinculado) só mexe em etapa/flag de
  -- negociação — valor/endereço/etc são do imóvel, só o dono altera
  if new.valor_venda is distinct from old.valor_venda
    or new.valor_estimado is distinct from old.valor_estimado
    or new.valor_anuncio is distinct from old.valor_anuncio
    or new.data_venda is distinct from old.data_venda
    or new.endereco_rua is distinct from old.endereco_rua
    or new.endereco_numero is distinct from old.endereco_numero
    or new.cnm is distinct from old.cnm
    or new.corretor_responsavel_id is distinct from old.corretor_responsavel_id
  then
    raise exception 'corretor % só pode alterar etapa/flag de negociação de imóvel de outro corretor', corretor_atual_id();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_restringe_update_imovel_cross_corretor on imoveis;
create trigger trg_restringe_update_imovel_cross_corretor
  before update on imoveis
  for each row execute function restringe_update_imovel_cross_corretor();

-- ---------- 4. negociacoes/vendas: só quem participa, não a equipe toda ----------

drop policy if exists "equipe_atualiza" on negociacoes;
create policy "participante_atualiza" on negociacoes
  for update to authenticated
  using (corretor_atual_id() in (corretor_imovel_id, corretor_cliente_id))
  with check (corretor_atual_id() in (corretor_imovel_id, corretor_cliente_id));

drop policy if exists "equipe_atualiza" on vendas;
create policy "participante_atualiza" on vendas
  for update to authenticated
  using (corretor_atual_id() in (corretor_imovel_id, corretor_cliente_id))
  with check (corretor_atual_id() in (corretor_imovel_id, corretor_cliente_id));
