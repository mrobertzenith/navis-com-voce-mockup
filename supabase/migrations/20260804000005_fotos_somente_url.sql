-- ============================================================
-- NAVIS COM VOCÊ · Migração 5: fotos somente por URL
--
-- Decisão de arquitetura: sem storage de imagens (custo zero).
-- Fotos são links (http/https) do próprio anúncio; sem foto, o
-- app usa a imagem padrão do tipo de imóvel. A trava impede que
-- qualquer cliente grave imagens embutidas (base64), que
-- inflariam o banco.
--
-- Antes da trava: normaliza as fotos do seed, que foram gravadas
-- como caminhos relativos do GitHub Pages e por isso quebravam
-- no site da Vercel (que serve na raiz).
-- ============================================================

update imoveis
set fotos = (
  select array_agg(
    case
      when f like '/navis-com-voce-mockup/%'
        then 'https://navis-crm.vercel.app' || substr(f, length('/navis-com-voce-mockup') + 1)
      when f like '/%'
        then 'https://navis-crm.vercel.app' || f
      else f
    end
  )
  from unnest(fotos) as f
)
where exists (select 1 from unnest(fotos) as f where f like '/%');

create or replace function public.fotos_sao_urls(fotos text[])
returns boolean
language sql
immutable
as $$
  select coalesce(
    bool_and(f like 'http://%' or f like 'https://%'),
    true
  )
  from unnest(fotos) as f
$$;

alter table imoveis
  add constraint fotos_somente_url check (fotos_sao_urls(fotos));
