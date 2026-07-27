-- ============================================================
-- NAVIS COM VOCÊ · Migração 1: schema inicial
-- Tradução de src/domain/types.ts para Postgres.
-- Convenção: snake_case no banco ↔ camelCase no app.
-- ============================================================

-- ---------- Enums ----------

create type papel_usuario as enum ('admin', 'corretor');

create type status_corretor as enum ('pendente_onboarding', 'ativo', 'suspenso');

create type tipo_imovel as enum (
  'apartamento',
  'casa_rua',
  'casa_condominio',
  'casa_comercial',
  'terreno_rua',
  'terreno_condominio',
  'terreno_comercial',
  'sala_comercial',
  'galpao_comercial_industrial'
);

create type etapa_imovel as enum ('a', 'b', 'c', 'd', 'e', 'f');

create type origem_lead as enum (
  'rede_social',
  'relacionamento',
  'indicacao',
  'campanha_online',
  'campanha_offline',
  'site'
);

create type origem_vinculo as enum (
  'sugerido_automatico',
  'manual_corretor',
  'visita',
  'negociacao',
  'venda'
);

create type status_negociacao as enum ('ativa', 'revertida', 'concluida');

create type motivo_imovel_perdido as enum ('ttl_expirado_30d', 'descarte_manual');

create type janela_digest as enum ('tempo_real', '15min', '30min', '1h', '2h', '4h');

-- ---------- Função utilitária: atualizado_em automático ----------

create or replace function set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

-- ---------- Corretores (inclui papel admin) ----------

create table corretores (
  id uuid primary key default gen_random_uuid(),
  -- vínculo com o login (preenchido na Fase 3; nulo enquanto o corretor não tem acesso)
  auth_user_id uuid unique references auth.users (id) on delete set null,
  papel papel_usuario not null default 'corretor',
  nome text not null,
  creci text not null default '',
  cidade text not null,
  estado text not null,
  email text not null unique,
  telefone_whatsapp text not null default '',
  foto_url text,
  status status_corretor not null default 'pendente_onboarding',
  criado_em timestamptz not null default now()
);

-- ---------- Imóveis ----------

create table imoveis (
  id uuid primary key default gen_random_uuid(),
  corretor_responsavel_id uuid not null references corretores (id),
  etapa etapa_imovel not null default 'a',

  endereco_rua text not null,
  endereco_numero text not null,
  bairro text not null,
  cidade text not null,
  estado text not null,
  cep text not null default '',
  lat double precision not null default 0,
  lng double precision not null default 0,

  tipo tipo_imovel not null,

  cnm text unique,
  matricula_url text,
  link_anuncio_url text,
  link_quebrado boolean,
  nome_condominio text,
  fotos text[] not null default '{}',

  valor_estimado numeric(14, 2),
  valor_anuncio numeric(14, 2),
  valor_venda numeric(14, 2),

  quartos smallint not null default 0,
  suites smallint not null default 0,
  vagas smallint not null default 0,
  banheiros smallint not null default 0,
  area_privativa_m2 numeric(10, 2),
  area_construida_m2 numeric(10, 2),
  area_terreno_m2 numeric(10, 2),

  elevador boolean,
  mobiliado boolean,
  com_armarios boolean,
  lazer boolean,
  varanda boolean,
  churrasqueira boolean,
  aceita_pet boolean,
  andar smallint,

  data_publicacao timestamptz,
  data_venda timestamptz,
  em_negociacao_flag boolean not null default false,
  ttl_atual timestamptz,
  observacoes text,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create trigger trg_imoveis_atualizado_em
  before update on imoveis
  for each row execute function set_atualizado_em();

create index idx_imoveis_corretor on imoveis (corretor_responsavel_id);
create index idx_imoveis_etapa on imoveis (etapa);
create index idx_imoveis_cidade_bairro on imoveis (cidade, bairro);

-- ---------- Leads + perfil de busca ----------

create table leads (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  corretor_responsavel_id uuid not null references corretores (id),
  etapa smallint not null default 1 check (etapa between 1 and 8),

  nome text not null,
  email text,
  telefone_whatsapp text,
  origem origem_lead,
  descricao_origem text,
  observacoes text,

  data_cadastro timestamptz not null default now(),
  ttl_atual timestamptz,

  -- listas pequenas e transientes do fluxo de etapas; espelham o modelo do app
  -- (normalizar vira tarefa da Fase 4, junto com o matching no servidor)
  visitas_agendadas jsonb not null default '[]',      -- [{imovelId, data}]
  negociacoes_ativas jsonb not null default '[]',     -- [{imovelId, dataInicio}]
  pendente_aprovacao_imoveis uuid[] not null default '{}',

  motivo_standby text,
  me_mantenha_informado boolean,
  motivo_perdido text,
  data_entrada_standby timestamptz,
  pagamentos_concluidos boolean,
  chaves_entregues boolean,
  imovel_fechado_id uuid references imoveis (id),
  valor_negociado numeric(14, 2),

  atualizado_em timestamptz not null default now()
);

create trigger trg_leads_atualizado_em
  before update on leads
  for each row execute function set_atualizado_em();

create index idx_leads_corretor on leads (corretor_responsavel_id);
create index idx_leads_etapa on leads (etapa);

create table perfis_busca (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references leads (id) on delete cascade,

  estado text not null,
  cidade text not null,
  bairros text[] not null default '{}',
  cep text,
  raio_km numeric(4, 1) not null default 5,

  tipos tipo_imovel[] not null default '{}',
  valor_de numeric(14, 2),
  valor_ate numeric(14, 2),

  quartos_min smallint,
  suites_min smallint,
  vagas_min smallint,
  banheiros_min smallint,
  area_de numeric(10, 2),
  area_ate numeric(10, 2),

  elevador boolean,
  mobiliado boolean,
  com_armarios boolean,
  lazer boolean,
  varanda boolean,
  churrasqueira boolean,
  aceita_pet boolean,
  nome_condominio text
);

-- ---------- Vínculos imóvel ↔ lead ----------

create table vinculos (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null references imoveis (id) on delete cascade,
  lead_id uuid not null references leads (id) on delete cascade,
  origem origem_vinculo not null,
  data_criacao timestamptz not null default now(),
  ativo boolean not null default true,
  dismissed_em timestamptz,
  unique (imovel_id, lead_id, origem)
);

create index idx_vinculos_imovel on vinculos (imovel_id);
create index idx_vinculos_lead on vinculos (lead_id);

-- ---------- Negociações ----------

create table negociacoes (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null references imoveis (id),
  lead_id uuid references leads (id),
  cliente_externo jsonb,                                -- {nome, email, telefone}
  corretor_imovel_id uuid not null references corretores (id),
  corretor_cliente_id uuid references corretores (id),
  data_inicio timestamptz not null default now(),
  data_fim timestamptz,
  status status_negociacao not null default 'ativa',
  valor_negociado numeric(14, 2)
);

create index idx_negociacoes_imovel on negociacoes (imovel_id);
create index idx_negociacoes_lead on negociacoes (lead_id);

-- ---------- Vendas ----------

create table vendas (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null references imoveis (id),
  lead_id uuid references leads (id),
  cliente_externo jsonb,                                -- {nome, email, telefone}
  corretor_imovel_id uuid not null references corretores (id),
  corretor_cliente_id uuid references corretores (id),
  valor_venda numeric(14, 2) not null,
  data_venda timestamptz not null default now(),
  tempo_anuncio_dias integer,
  revertida boolean not null default false,
  justificativa_reversao text,
  pagamentos_concluidos boolean not null default false,
  chaves_entregues boolean not null default false
);

create index idx_vendas_corretor_imovel on vendas (corretor_imovel_id);

-- ---------- Imóveis perdidos (arquivo com snapshot) ----------

create table imoveis_perdidos (
  id uuid primary key default gen_random_uuid(),
  imovel_snapshot jsonb not null,
  corretor_id uuid not null references corretores (id),
  motivo motivo_imovel_perdido not null,
  data_arquivamento timestamptz not null default now(),
  recuperavel boolean not null default true
);

-- ---------- Interações do matching ----------

create table interesses_posteriores (
  corretor_id uuid not null references corretores (id) on delete cascade,
  imovel_id uuid not null references imoveis (id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (corretor_id, imovel_id)
);

create table dismisses (
  corretor_id uuid not null references corretores (id) on delete cascade,
  lead_id uuid not null references leads (id) on delete cascade,
  imovel_id uuid not null references imoveis (id) on delete cascade,
  data_dismiss timestamptz not null default now(),
  primary key (corretor_id, lead_id, imovel_id)
);

-- ---------- Notificações e atividades ----------

create table notificacoes (
  id uuid primary key default gen_random_uuid(),
  destinatario_corretor_id uuid not null references corretores (id) on delete cascade,
  tipo_evento text not null check (tipo_evento ~ '^E([1-9]|1[0-9]|20)$'),
  titulo text not null,
  corpo text not null,
  lida boolean not null default false,
  criada_em timestamptz not null default now(),
  acao_pendente jsonb,                                  -- {leadId, imovelId}
  resolvida boolean
);

create index idx_notificacoes_destinatario on notificacoes (destinatario_corretor_id, lida);

create table atividades (
  id uuid primary key default gen_random_uuid(),
  corretor_id uuid not null references corretores (id) on delete cascade,
  descricao text not null,
  criado_em timestamptz not null default now()
);

-- ---------- Preferências e pesos de score por corretor ----------

create table preferencias_notificacao (
  corretor_id uuid primary key references corretores (id) on delete cascade,
  janela_digest janela_digest not null default 'tempo_real'
);

create table pesos_score (
  corretor_id uuid primary key references corretores (id) on delete cascade,
  pesos jsonb not null default '{}'                     -- {atributo: peso 0-5}
);

-- ============================================================
-- RLS: habilitado em todas as tabelas desde já.
-- ATENÇÃO: as políticas abaixo são PERMISSIVAS (fase de transição,
-- app ainda sem login). A Fase 3 substitui por regras reais
-- (corretor só edita o que é dele; admin gerencia a equipe).
-- ============================================================

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
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "transicao_fase2_acesso_total" on %I for all using (true) with check (true)',
      t
    );
  end loop;
end;
$$;
