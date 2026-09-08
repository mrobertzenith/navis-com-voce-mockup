-- ============================================================
-- NAVIS COM VOCÊ · Migração 8: um imóvel não pode estar em
-- mais de uma negociação ativa ao mesmo tempo
--
-- Contexto: essa regra já tinha sido violada de verdade em produção
-- (dois clientes de corretores diferentes com o mesmo imóvel em
-- negociacoes_ativas) porque a única checagem existia no código do
-- front-end (ModalGateCliente.tsx) — bastava um bug ali, uma corrida,
-- ou uma chamada direta à API pra furar a regra. Isso já aconteceu
-- em três rodadas de teste de uso diferentes.
--
-- O modelo de dados correto pra isso é a tabela `negociacoes` (criada
-- desde a migração 1, com status 'ativa'/'revertida'/'concluida' e
-- FKs de verdade) — mas o app usa hoje um array solto em
-- leads.negociacoes_ativas (jsonb), sem chave estrangeira nem unique
-- possível diretamente. Migrar pra tabela relacional é trabalho maior
-- (reescrever ~11 arquivos do app) e está planejado separadamente.
--
-- Esta migração é a rede de segurança no meio tempo: um trigger que
-- transforma a regra numa restrição de banco de verdade, válida
-- mesmo que o código do app tenha um bug, sem precisar da reescrita
-- completa agora.
-- ============================================================

create or replace function public.impedir_negociacao_duplicada()
returns trigger
language plpgsql
as $$
declare
  conflito record;
begin
  select l2.codigo as cliente_conflitante, elem->>'imovelId' as imovel_id
  into conflito
  from jsonb_array_elements(coalesce(new.negociacoes_ativas, '[]'::jsonb)) as elem
  join leads l2
    on l2.id <> new.id
    and exists (
      select 1
      from jsonb_array_elements(coalesce(l2.negociacoes_ativas, '[]'::jsonb)) as elem2
      where elem2 ->> 'imovelId' = elem ->> 'imovelId'
    )
  limit 1;

  if conflito is not null then
    raise exception
      'Imóvel % já está em negociação ativa com o cliente % — não pode estar em duas negociações ao mesmo tempo',
      conflito.imovel_id, conflito.cliente_conflitante
      using errcode = '23505';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_impedir_negociacao_duplicada on leads;
create trigger trg_impedir_negociacao_duplicada
  before insert or update of negociacoes_ativas on leads
  for each row
  execute function public.impedir_negociacao_duplicada();
