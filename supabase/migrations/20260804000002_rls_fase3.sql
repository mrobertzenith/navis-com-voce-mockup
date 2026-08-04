-- ============================================================
-- NAVIS COM VOCÊ · Migração 2: RLS da Fase 3 (login obrigatório)
--
-- Substitui a política transitória "acesso total" da Fase 2 por:
--   · acesso SOMENTE para usuários autenticados (anon = bloqueado)
--   · tabela corretores: escrita somente admin
--   · delete: somente admin, em todas as tabelas
--
-- Nota deliberada: corretores autenticados ainda podem editar
-- imóveis/leads uns dos outros — os fluxos cross-corretor
-- (negociação com aprovação, vínculos) escrevem em registros do
-- outro corretor. O aperto por dono acontece na Fase 4, quando
-- gates e matching migram para Edge Functions.
-- ============================================================

-- ---------- Funções auxiliares ----------

create or replace function public.corretor_atual_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from corretores where email = (auth.jwt() ->> 'email') limit 1
$$;

create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from corretores
    where email = (auth.jwt() ->> 'email') and papel = 'admin'
  )
$$;

-- ---------- Troca das políticas ----------

do $$
declare
  t text;
begin
  foreach t in array array[
    'corretores', 'imoveis', 'leads', 'perfis_busca', 'vinculos',
    'negociacoes', 'vendas', 'imoveis_perdidos', 'interesses_posteriores',
    'dismisses', 'notificacoes', 'atividades', 'preferencias_notificacao',
    'pesos_score'
  ]
  loop
    execute format('drop policy if exists "transicao_fase2_acesso_total" on %I', t);

    -- leitura: qualquer corretor logado
    execute format(
      'create policy "autenticado_le" on %I for select to authenticated using (true)', t
    );

    -- delete: somente admin
    execute format(
      'create policy "admin_apaga" on %I for delete to authenticated using (eh_admin())', t
    );

    if t = 'corretores' then
      -- gestão da equipe é exclusiva do admin
      execute
        'create policy "admin_insere" on corretores for insert to authenticated with check (eh_admin())';
      execute
        'create policy "admin_atualiza" on corretores for update to authenticated using (eh_admin()) with check (eh_admin())';
    else
      -- demais tabelas: qualquer corretor logado escreve (aperto na Fase 4)
      execute format(
        'create policy "autenticado_insere" on %I for insert to authenticated with check (true)', t
      );
      execute format(
        'create policy "autenticado_atualiza" on %I for update to authenticated using (true) with check (true)', t
      );
    end if;
  end loop;
end;
$$;
