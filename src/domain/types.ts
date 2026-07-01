export type TipoImovel =
  | 'apartamento'
  | 'casa_rua'
  | 'casa_condominio'
  | 'casa_comercial'
  | 'terreno_rua'
  | 'terreno_condominio'
  | 'terreno_comercial'
  | 'sala_comercial'
  | 'galpao_comercial_industrial'

export type EtapaImovel = 'a' | 'b' | 'c' | 'd' | 'e' | 'f'

export type EtapaLead = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export type OrigemLead =
  | 'rede_social'
  | 'relacionamento'
  | 'indicacao'
  | 'campanha_online'
  | 'campanha_offline'
  | 'site'

export type OrigemVinculo = 'sugerido_automatico' | 'manual_corretor' | 'visita' | 'negociacao' | 'venda'

export interface Corretor {
  id: string
  nome: string
  creci: string
  cidade: string
  estado: string
  email: string
  telefoneWhatsapp: string
  fotoUrl?: string
  status: 'pendente_onboarding' | 'ativo' | 'suspenso'
  criadoEm: string
}

export type AtributoScore =
  | 'quartos'
  | 'suites'
  | 'vagas'
  | 'banheiros'
  | 'area'
  | 'bairro_exato_vs_raio'
  | 'preco_dentro_vs_tolerancia'
  | 'elevador'
  | 'mobiliado'
  | 'lazer'
  | 'varanda'
  | 'churrasqueira'
  | 'aceita_pet'
  | 'nome_condominio_match'

export type PesosScore = Record<AtributoScore, number>

export interface PreferenciasNotificacao {
  corretorId: string
  janelaDigest: 'tempo_real' | '15min' | '30min' | '1h' | '2h' | '4h'
}

export interface Imovel {
  id: string
  corretorResponsavelId: string
  etapa: EtapaImovel

  enderecoRua: string
  enderecoNumero: string
  bairro: string
  cidade: string
  estado: string
  cep: string
  lat: number
  lng: number

  tipo: TipoImovel

  cib?: string
  matriculaUrl?: string
  linkAnuncioUrl?: string
  nomeCondominio?: string

  valorEstimado?: number
  valorAnuncio?: number
  valorVenda?: number

  quartos: number
  suites: number
  vagas: number
  banheiros: number
  areaPrivativaM2?: number
  areaConstruidaM2?: number
  areaTerrenoM2?: number

  elevador?: boolean
  mobiliado?: boolean
  lazer?: boolean
  varanda?: boolean
  churrasqueira?: boolean
  aceitaPet?: boolean
  andar?: number

  dataPublicacao?: string
  dataVenda?: string
  emNegociacaoFlag: boolean
  ttlAtual?: string
  observacoes?: string

  criadoEm: string
  atualizadoEm: string
}

export interface ImovelPerdido {
  id: string
  imovelSnapshot: Imovel
  corretorId: string
  motivo: 'ttl_expirado_30d' | 'descarte_manual'
  dataArquivamento: string
  recuperavel: boolean
}

export interface PerfilBusca {
  id: string
  leadId: string

  estado: string
  cidade: string
  bairros: string[]
  cep?: string
  raioKm: number

  tipos: TipoImovel[]
  valorDe: number | null
  valorAte: number | null

  quartosMin?: number
  suitesMin?: number
  vagasMin?: number
  banheirosMin?: number
  areaDe?: number
  areaAte?: number

  elevador?: boolean
  mobiliado?: boolean
  lazer?: boolean
  varanda?: boolean
  churrasqueira?: boolean
  aceitaPet?: boolean
  nomeCondominio?: string
}

export interface Lead {
  id: string
  codigo: string
  corretorResponsavelId: string
  etapa: EtapaLead

  nome: string
  perfilBusca: PerfilBusca

  email?: string
  telefoneWhatsapp?: string
  origem?: OrigemLead
  descricaoOrigem?: string
  observacoes?: string

  dataCadastro: string
  ttlAtual?: string
  motivoStandby?: string
  meMantenhaInformado?: boolean
  motivoPerdido?: string
  dataEntradaStandby?: string
}

export interface Vinculo {
  id: string
  imovelId: string
  leadId: string
  origem: OrigemVinculo
  dataCriacao: string
  ativo: boolean
  dismissedEm?: string
}

export interface Negociacao {
  id: string
  imovelId: string
  leadId: string | null
  clienteExterno?: { nome: string; email: string; telefone: string }
  corretorImovelId: string
  corretorClienteId?: string
  dataInicio: string
  dataFim?: string
  status: 'ativa' | 'revertida' | 'concluida'
  valorNegociado?: number
}

export interface Venda {
  id: string
  imovelId: string
  leadId?: string
  clienteExterno?: { nome: string; email: string; telefone: string }
  corretorImovelId: string
  corretorClienteId?: string
  valorVenda: number
  dataVenda: string
  tempoAnuncioDias?: number
  revertida: boolean
  justificativaReversao?: string
  pagamentosConcluidos: boolean
  chavesEntregues: boolean
}

export interface InteressePosterior {
  corretorId: string
  imovelId: string
  criadoEm: string
}

export interface Dismiss {
  corretorId: string
  leadId: string
  imovelId: string
  dataDismiss: string
}

export type TipoEvento =
  | 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'E7' | 'E8' | 'E9' | 'E10'
  | 'E11' | 'E12' | 'E13' | 'E14' | 'E15' | 'E16' | 'E17' | 'E18' | 'E19' | 'E20'

export interface Notificacao {
  id: string
  destinatarioCorretorId: string
  tipoEvento: TipoEvento
  titulo: string
  corpo: string
  lida: boolean
  criadaEm: string
}

export interface Atividade {
  id: string
  corretorId: string
  descricao: string
  timestamp: string
}

export interface MatchResult {
  imovelId: string
  leadId: string
  score: number
  isAviso: boolean
}
