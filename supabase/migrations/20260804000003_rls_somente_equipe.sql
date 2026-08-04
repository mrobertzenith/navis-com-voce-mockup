-- ============================================================
-- NAVIS COM VOCÊ · Migração 3: acesso restrito à equipe
--
-- A migração 2 liberava leitura/escrita para qualquer usuário
-- AUTENTICADO. Como o signup público do Supabase pode estar
-- aberto, um estranho poderia criar conta e ler dados.
-- Correção: além de autenticado, o e-mail da sessão precisa
-- existir na tabela corretores (fazer parte da equipe).
-- ============================================================

create or replace function public.eh_da_equipe()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select corretor_atual_id() is not null
$$;

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
    execute format('drop policy if exists "autenticado_le" on %I', t);
    execute format(
      'create policy "equipe_le" on %I for select to authenticated using (eh_da_equipe())', t
    );

    if t <> 'corretores' then
      execute format('drop policy if exists "autenticado_insere" on %I', t);
      execute format('drop policy if exists "autenticado_atualiza" on %I', t);
      execute format(
        'create policy "equipe_insere" on %I for insert to authenticated with check (eh_da_equipe())', t
      );
      execute format(
        'create policy "equipe_atualiza" on %I for update to authenticated using (eh_da_equipe()) with check (eh_da_equipe())', t
      );
    end if;
  end loop;
end;
$$;
