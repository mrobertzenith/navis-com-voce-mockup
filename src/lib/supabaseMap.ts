import type { Imovel, Lead, PerfilBusca } from '@/domain/types'

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
  fotos: 'fotos',
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

const LEAD_CAMPOS: Record<
  keyof Omit<Lead, 'id' | 'perfilBusca' | 'imovelNegociacaoId'>,
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
  negociacoesAtivas: 'negociacoes_ativas',
  pendenteAprovacaoImoveis: 'pendente_aprovacao_imoveis',
  motivoStandby: 'motivo_standby',
  meMantenhaInformado: 'me_mantenha_informado',
  motivoPerdido: 'motivo_perdido',
  dataEntradaStandby: 'data_entrada_standby',
  pagamentosConcluidos: 'pagamentos_concluidos',
  chavesEntregues: 'chaves_entregues',
  imovelFechadoId: 'imovel_fechado_id',
  valorNegociado: 'valor_negociado',
}

const PERFIL_CAMPOS: Record<keyof Omit<PerfilBusca, 'id' | 'leadId'>, string> = {
  estado: 'estado',
  cidade: 'cidade',
  bairros: 'bairros',
  cep: 'cep',
  raioKm: 'raio_km',
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
  'data_cadastro', 'data_entrada_standby',
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

function paraRow(patch: Row, campos: Record<string, string>): Row {
  const out: Row = {}
  for (const [campoApp, coluna] of Object.entries(campos)) {
    if (campoApp in patch) out[coluna] = patch[campoApp] === undefined ? null : patch[campoApp]
  }
  return out
}

// ---------- Imóvel ----------

export function imovelParaDominio(row: Row): Imovel {
  const imovel = paraDominio<Imovel>(row, IMOVEL_CAMPOS)
  // banco tem default '{}'; array vazio vira undefined para o app usar a foto padrão
  if (Array.isArray(imovel.fotos) && imovel.fotos.length === 0) delete imovel.fotos
  return imovel
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
