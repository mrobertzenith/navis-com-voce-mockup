-- ============================================================
-- NAVIS COM VOCÊ · Migração 4: corretor suspenso perde acesso aos dados
-- (além do banimento de login feito pela Edge Function "equipe")
-- ============================================================

create or replace function public.corretor_atual_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from corretores
  where email = (auth.jwt() ->> 'email')
    and status <> 'suspenso'
  limit 1
$$;
