import type { Imovel, Lead, Negociacao, PerfilBusca, Venda } from '@/domain/types'

/**
 * Conversão entre o modelo do app (camelCase) e as tabelas Postgres (snake_case).
 * Regra: null vindo do banco vira undefined no domínio (exceto valorDe/valorAte,
 * que o domínio declara como number | null).
 */

type Row = Record<string, unknown>

const IMOVEL_CAMPOS: Record<keyof Omit<Imovel, 'id'>, string> = {
  corretorResponsavelId: 'corretor_responsavel_id',
  etapa: 'etapa',
  enderecoRua: 'endereco_rua',
  enderecoNumero: 'endereco_numero',
  bairro: 'bairro',
  cidade: 'cidade',
  estado: 'estado',
  cep: 'cep',
  lat: 'lat',
  lng: 'lng',
  tipo: 'tipo',
  cnm: 'cnm',
  matriculaUrl: 'matricula_url',
  linkAnuncioUrl: 'link_anuncio_url',
  linkQuebrado: 'link_quebrado',
  nomeCondominio: 'nome_condominio',
  diferenciaisExtras: 'diferenciais_extras',
  valorEstimado: 'valor_estimado',
  valorAnuncio: 'valor_anuncio',
  valorVenda: 'valor_venda',
  quartos: 'quartos',
  suites: 'suites',
  vagas: 'vagas',
  banheiros: 'banheiros',
  areaPrivativaM2: 'area_privativa_m2',
  areaConstruidaM2: 'area_construida_m2',
  areaTerrenoM2: 'area_terreno_m2',
  elevador: 'elevador',
  mobiliado: 'mobiliado',
  comArmarios: 'com_armarios',
  lazer: 'lazer',
  varanda: 'varanda',
  churrasqueira: 'churrasqueira',
  aceitaPet: 'aceita_pet',
  andar: 'andar',
  dataPublicacao: 'data_publicacao',
  dataVenda: 'data_venda',
  emNegociacaoFlag: 'em_negociacao_flag',
  ttlAtual: 'ttl_atual',
  observacoes: 'observacoes',
  criadoEm: 'criado_em',
  atualizadoEm: 'atualizado_em',
}

// negociacoesAtivas/imovelFechadoId/valorNegociado/pagamentosConcluidos/
// chavesEntregues saem daqui de propósito: são calculados a partir de
// negociacoes/vendas na leitura (useLeads), não colunas de leads que se
// escreve diretamente — ver o comentário em domain/types.ts.
const LEAD_CAMPOS: Record<
  keyof Omit<
    Lead,
    | 'id'
    | 'perfilBusca'
    | 'imovelNegociacaoId'
    | 'negociacoesAtivas'
    | 'imovelFechadoId'
    | 'valorNegociado'
    | 'pagamentosConcluidos'
    | 'chavesEntregues'
  >,
  string
> = {
  codigo: 'codigo',
  corretorResponsavelId: 'corretor_responsavel_id',
  etapa: 'etapa',
  nome: 'nome',
  email: 'email',
  telefoneWhatsapp: 'telefone_whatsapp',
  origem: 'origem',
  descricaoOrigem: 'descricao_origem',
  observacoes: 'observacoes',
  dataCadastro: 'data_cadastro',
  ttlAtual: 'ttl_atual',
  visitasAgendadas: 'visitas_agendadas',
  pendenteAprovacaoImoveis: 'pendente_aprovacao_imoveis',
  motivoStandby: 'motivo_standby',
  meMantenhaInformado: 'me_mantenha_informado',
  motivoPerdido: 'motivo_perdido',
  dataEntradaStandby: 'data_entrada_standby',
}

const NEGOCIACAO_CAMPOS: Record<keyof Omit<Negociacao, 'id'>, string> = {
  imovelId: 'imovel_id',
  leadId: 'lead_id',
  clienteExterno: 'cliente_externo',
  corretorImovelId: 'corretor_imovel_id',
  corretorClienteId: 'corretor_cliente_id',
  dataInicio: 'data_inicio',
  dataFim: 'data_fim',
  status: 'status',
  valorNegociado: 'valor_negociado',
}

const VENDA_CAMPOS: Record<keyof Omit<Venda, 'id'>, string> = {
  negociacaoId: 'negociacao_id',
  imovelId: 'imovel_id',
  leadId: 'lead_id',
  clienteExterno: 'cliente_externo',
  corretorImovelId: 'corretor_imovel_id',
  corretorClienteId: 'corretor_cliente_id',
  valorVenda: 'valor_venda',
  dataVenda: 'data_venda',
  tempoAnuncioDias: 'tempo_anuncio_dias',
  revertida: 'revertida',
  justificativaReversao: 'justificativa_reversao',
  pagamentosConcluidos: 'pagamentos_concluidos',
  chavesEntregues: 'chaves_entregues',
}

const PERFIL_CAMPOS: Record<keyof Omit<PerfilBusca, 'id' | 'leadId'>, string> = {
  estado: 'estado',
  cidade: 'cidade',
  bairros: 'bairros',
  cep: 'cep',
  raioKm: 'raio_km',
  lat: 'lat',
  lng: 'lng',
  tipos: 'tipos',
  valorDe: 'valor_de',
  valorAte: 'valor_ate',
  quartosMin: 'quartos_min',
  suitesMin: 'suites_min',
  vagasMin: 'vagas_min',
  banheirosMin: 'banheiros_min',
  areaDe: 'area_de',
  areaAte: 'area_ate',
  elevador: 'elevador',
  mobiliado: 'mobiliado',
  comArmarios: 'com_armarios',
  lazer: 'lazer',
  varanda: 'varanda',
  churrasqueira: 'churrasqueira',
  aceitaPet: 'aceita_pet',
  nomeCondominio: 'nome_condominio',
}

/** timestamptz volta como "2026-07-01 12:00:00+00" ou ISO — normaliza para ISO-8601 */
function normalizarData(v: unknown): unknown {
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}[T ]/.test(v)) {
    return new Date(v).toISOString()
  }
  return v
}

const CAMPOS_DATA = new Set([
  'criado_em', 'atualizado_em', 'data_publicacao', 'data_venda', 'ttl_atual',
  'data_cadastro', 'data_entrada_standby', 'data_inicio', 'data_fim',
])

function paraDominio<T>(row: Row, campos: Record<string, string>, manterNull: Set<string> = new Set()): T {
  const out: Row = { id: row.id }
  for (const [campoApp, coluna] of Object.entries(campos)) {
    let v = row[coluna]
    if (CAMPOS_DATA.has(coluna)) v = normalizarData(v)
    if (v === null && !manterNull.has(campoApp)) continue
    out[campoApp] = v
  }
  return out as T
}

/**
 * Colunas NOT NULL com default no banco. Escrever null nelas quebra o insert
 * (foi a causa do "Concluir cadastro" mudo no cadastro de cliente): quando o
 * valor não vem, a chave é omitida e o default do banco assume.
 */
const COLUNAS_NAO_NULAS = new Set([
  'diferenciais_extras',
  'visitas_agendadas',
  'negociacoes_ativas',
  'pendente_aprovacao_imoveis',
  'em_negociacao_flag',
  'bairros',
  'tipos',
])

function paraRow(patch: Row, campos: Record<string, string>): Row {
  const out: Row = {}
  for (const [campoApp, coluna] of Object.entries(campos)) {
    if (!(campoApp in patch)) continue
    const valor = patch[campoApp]
    if (valor == null && COLUNAS_NAO_NULAS.has(coluna)) continue
    out[coluna] = valor === undefined ? null : valor
  }
  return out
}

// ---------- Imóvel ----------

export function imovelParaDominio(row: Row): Imovel {
  return paraDominio<Imovel>(row, IMOVEL_CAMPOS)
}

export function imovelParaRow(patch: Partial<Imovel>): Row {
  return paraRow(patch as Row, IMOVEL_CAMPOS)
}

// ---------- Lead + perfil de busca ----------

export function leadParaDominio(row: Row): Lead {
  const lead = paraDominio<Lead>(row, LEAD_CAMPOS)
  const perfilRow = (Array.isArray(row.perfis_busca) ? row.perfis_busca[0] : row.perfis_busca) as
    | Row
    | undefined
  if (perfilRow) {
    const perfil = paraDominio<PerfilBusca>(perfilRow, PERFIL_CAMPOS, new Set(['valorDe', 'valorAte']))
    perfil.leadId = String(row.id)
    lead.perfilBusca = perfil
  }
  return lead
}

export function leadParaRow(patch: Partial<Lead>): Row {
  return paraRow(patch as Row, LEAD_CAMPOS)
}

export function perfilParaRow(patch: Partial<PerfilBusca>): Row {
  return paraRow(patch as Row, PERFIL_CAMPOS)
}

// ---------- Negociação + Venda ----------

export function negociacaoParaDominio(row: Row): Negociacao {
  return paraDominio<Negociacao>(row, NEGOCIACAO_CAMPOS)
}

export function negociacaoParaRow(patch: Partial<Negociacao>): Row {
  return paraRow(patch as Row, NEGOCIACAO_CAMPOS)
}

export function vendaParaDominio(row: Row): Venda {
  return paraDominio<Venda>(row, VENDA_CAMPOS)
}

export function vendaParaRow(patch: Partial<Venda>): Row {
  return paraRow(patch as Row, VENDA_CAMPOS)
}
