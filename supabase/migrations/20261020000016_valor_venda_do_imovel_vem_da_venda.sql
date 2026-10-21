-- Quando uma venda é confirmada, os triggers de sincronia (migrações 12–14)
-- marcam o imóvel como vendido (etapa 'f' + data_venda) e criam a linha em
-- `vendas` com o valor — mas nunca preenchiam `imoveis.valor_venda`. Quem lê
-- o valor pelo imóvel (Dashboard, aba "Imóveis Vendidos") via "—"/R$ 0 em
-- toda venda real. Mesmo problema que quebraria um ranking de VGV lido do
-- imóvel (achado de 20/10/2026).
--
-- A fonte da verdade é a venda; o imóvel só espelha. Trigger pequeno em
-- `vendas` em vez de reescrever as funções gigantes das migrações 12–14.
-- Só espelha venda NÃO revertida: uma reversão pode ser feita por quem não é
-- dono do imóvel, e a trava de update cross-corretor (migração 11) proíbe
-- não-dono mexer em valor_venda. O imóvel revertido volta a outra etapa, então
-- o valor antigo ali é inofensivo (e é sobrescrito numa nova venda).

create or replace function espelha_valor_venda_no_imovel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.revertida = false then
    update imoveis
       set valor_venda = new.valor_venda
     where id = new.imovel_id
       and valor_venda is distinct from new.valor_venda;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_espelha_valor_venda_no_imovel on vendas;
create trigger trg_espelha_valor_venda_no_imovel
  after insert or update of valor_venda, revertida on vendas
  for each row execute function espelha_valor_venda_no_imovel();

-- vendas que já existiam antes deste trigger
update imoveis i
   set valor_venda = v.valor_venda
  from vendas v
 where v.imovel_id = i.id
   and v.revertida = false
   and i.valor_venda is distinct from v.valor_venda;
