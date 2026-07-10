import type { EtapaLead, Lead, OrigemLead, TipoImovel } from '@/domain/types'
import { CORRETOR_LOGADO_ID } from '@/mocks/data/corretores'

let seq = 2400
function proximoCodigo(): string {
  seq += 1
  return `Cliente #${seq}`
}

interface ClienteSeed {
  corretorResponsavelId: string
  etapa: EtapaLead
  nome: string
  email?: string
  telefoneWhatsapp?: string
  origem?: OrigemLead
  observacoes?: string
  dataCadastro: string
  visitasAgendadas?: { imovelId: string; data: string }[]
  motivoStandby?: string
  meMantenhaInformado?: boolean
  motivoPerdido?: string
  dataEntradaStandby?: string
  pagamentosConcluidos?: boolean
  chavesEntregues?: boolean
  negociacoesAtivas?: { imovelId: string; dataInicio: string }[]

  estado: string
  cidade: string
  bairros: string[]
  raioKm?: number
  tipos: TipoImovel[]
  valorDe: number | null
  valorAte: number | null
  quartosMin?: number
  suitesMin?: number
  vagasMin?: number
  areaDe?: number
  areaAte?: number
  elevador?: boolean
  mobiliado?: boolean
  lazer?: boolean
  churrasqueira?: boolean
  aceitaPet?: boolean
}

function construir(seed: ClienteSeed): Lead {
  const id = `lead-${seq + 1}`
  const codigo = proximoCodigo()
  return {
    id,
    codigo,
    corretorResponsavelId: seed.corretorResponsavelId,
    etapa: seed.etapa,
    nome: seed.nome,
    email: seed.email,
    telefoneWhatsapp: seed.telefoneWhatsapp,
    origem: seed.origem,
    observacoes: seed.observacoes,
    dataCadastro: seed.dataCadastro,
    visitasAgendadas: seed.visitasAgendadas,
    motivoStandby: seed.motivoStandby,
    meMantenhaInformado: seed.meMantenhaInformado,
    motivoPerdido: seed.motivoPerdido,
    dataEntradaStandby: seed.dataEntradaStandby,
    pagamentosConcluidos: seed.pagamentosConcluidos,
    chavesEntregues: seed.chavesEntregues,
    negociacoesAtivas: seed.negociacoesAtivas,
    perfilBusca: {
      id: `pb-${id}`,
      leadId: id,
      estado: seed.estado,
      cidade: seed.cidade,
      bairros: seed.bairros,
      raioKm: seed.raioKm ?? 5,
      tipos: seed.tipos,
      valorDe: seed.valorDe,
      valorAte: seed.valorAte,
      quartosMin: seed.quartosMin,
      suitesMin: seed.suitesMin,
      vagasMin: seed.vagasMin,
      areaDe: seed.areaDe,
      areaAte: seed.areaAte,
      elevador: seed.elevador,
      mobiliado: seed.mobiliado,
      lazer: seed.lazer,
      churrasqueira: seed.churrasqueira,
      aceitaPet: seed.aceitaPet,
    },
  }
}

const ANA = CORRETOR_LOGADO_ID
const OUTROS = ['cor-2', 'cor-3', 'cor-4', 'cor-5', 'cor-6', 'cor-7', 'cor-8', 'cor-9', 'cor-10']

// Imóveis em negociação (etapa e) do dataset de imoveis.ts, usados para negociacoesAtivas:
// im-024 (apto Ribeirânia), im-025 (casa Taquaral/Campinas), im-026 (apto Alto da Boa Vista), im-027 (apto Jardim Paulistano/São Carlos)

export const LEADS_SEED: Lead[] = [
  // ============ ETAPA (1) — Novo Lead — 3 ============
  construir({
    corretorResponsavelId: ANA, etapa: 1, nome: 'Rafael Tavares',
    telefoneWhatsapp: '16991110001', origem: 'site',
    dataCadastro: '2026-06-25T10:00:00.000Z',
    estado: 'SP', cidade: 'Ribeirão Preto', bairros: ['Jardim Sumaré', 'Nova Aliança'],
    tipos: ['apartamento'], valorDe: 380000, valorAte: 500000, quartosMin: 2,
  }),
  construir({
    corretorResponsavelId: OUTROS[0], etapa: 1, nome: 'Juliana Prado',
    telefoneWhatsapp: '16992220002', origem: 'indicacao',
    dataCadastro: '2026-06-28T10:00:00.000Z',
    estado: 'SP', cidade: 'Ribeirão Preto', bairros: ['Jardim Canadá'],
    tipos: ['casa_condominio'], valorDe: 1500000, valorAte: 2000000, quartosMin: 4,
  }),
  construir({
    corretorResponsavelId: ANA, etapa: 1, nome: 'Otávio Nascimento',
    telefoneWhatsapp: '16993330003', origem: 'rede_social',
    dataCadastro: '2026-06-29T10:00:00.000Z',
    estado: 'SP', cidade: 'Ribeirão Preto', bairros: ['Alto do Ipiranga', 'City Ribeirão'],
    tipos: ['sala_comercial'], valorDe: null, valorAte: 350000,
  }),

  // ============ ETAPA (2) — Em contato — 5 ============
  construir({
    corretorResponsavelId: ANA, etapa: 2, nome: 'Marcos Henrique Oliveira',
    telefoneWhatsapp: '16994440004', origem: 'indicacao', observacoes: 'Cliente quer visitar em duas semanas, prefere ligação.',
    dataCadastro: '2026-06-10T10:00:00.000Z',
    estado: 'SP', cidade: 'Ribeirão Preto', bairros: ['Alto da Boa Vista', 'Ribeirânia'],
    tipos: ['apartamento'], valorDe: 500000, valorAte: 700000, quartosMin: 3, suitesMin: 1,
  }),
  construir({
    corretorResponsavelId: ANA, etapa: 2, nome: 'Fernanda Lima',
    telefoneWhatsapp: '16995550005', origem: 'campanha_online', observacoes: 'Já visitou similar em outro bairro, procurando elevador.',
    dataCadastro: '2026-06-12T10:00:00.000Z',
    estado: 'SP', cidade: 'Ribeirão Preto', bairros: ['Jardim Sumaré', 'Jardim Botânico'],
    tipos: ['apartamento'], valorDe: 400000, valorAte: 650000, elevador: true,
  }),
  construir({
    corretorResponsavelId: OUTROS[1], etapa: 2, nome: 'Rodrigo Farias',
    telefoneWhatsapp: '11996660006', origem: 'site', observacoes: 'Trabalha na região de Pinheiros, busca mobiliado.',
    dataCadastro: '2026-06-08T10:00:00.000Z',
    estado: 'SP', cidade: 'São Paulo', bairros: ['Pinheiros'],
    tipos: ['apartamento'], valorDe: 900000, valorAte: 1400000, mobiliado: true,
  }),
  construir({
    corretorResponsavelId: OUTROS[2], etapa: 2, nome: 'Tatiane Cardoso',
    telefoneWhatsapp: '16997770007', origem: 'relacionamento', observacoes: 'Família com pet, precisa aceitar animais.',
    dataCadastro: '2026-06-15T10:00:00.000Z',
    estado: 'SP', cidade: 'Ribeirão Preto', bairros: ['Jardim Canadá', 'Jardim Botânico'],
    tipos: ['casa_condominio'], valorDe: 1600000, valorAte: 2200000, aceitaPet: true,
  }),
  construir({
    corretorResponsavelId: ANA, etapa: 2, nome: 'Eduardo Vasconcelos',
    telefoneWhatsapp: '19998880008', origem: 'site', observacoes: 'Investidor, procura terrenos para futura construção.',
    dataCadastro: '2026-06-05T10:00:00.000Z',
    estado: 'SP', cidade: 'Campinas', bairros: ['Jardim Chapadão'],
    tipos: ['terreno_condominio', 'terreno_rua'], valorDe: null, valorAte: 500000,
  }),

  // ============ ETAPA (3) — Visita agendada — 6 ============
  construir({
    corretorResponsavelId: ANA, etapa: 3, nome: 'Camila Duarte',
    telefoneWhatsapp: '16999990009', origem: 'indicacao', observacoes: 'Visita marcada para o fim de semana.',
    dataCadastro: '2026-05-20T10:00:00.000Z',
    visitasAgendadas: [{ imovelId: 'im-014', data: '2026-07-04T14:00:00.000Z' }],
    estado: 'SP', cidade: 'Ribeirão Preto', bairros: ['Jardim Sumaré'],
    tipos: ['apartamento'], valorDe: 420000, valorAte: 520000, quartosMin: 2, vagasMin: 2,
  }),
  construir({
    corretorResponsavelId: ANA, etapa: 3, nome: 'Vinícius Andrade',
    telefoneWhatsapp: '16990001010', origem: 'site', observacoes: 'Segunda visita, já viu duas opções.',
    dataCadastro: '2026-05-15T10:00:00.000Z',
    visitasAgendadas: [{ imovelId: 'im-015', data: '2026-07-03T10:00:00.000Z' }],
    estado: 'SP', cidade: 'Ribeirão Preto', bairros: ['Jardim Botânico', 'Ribeirânia'],
    tipos: ['apartamento'], valorDe: 600000, valorAte: 800000, suitesMin: 2, lazer: true,
  }),
  construir({
    corretorResponsavelId: OUTROS[3], etapa: 3, nome: 'Priscila Mendes',
    telefoneWhatsapp: '16991002020', origem: 'campanha_online', observacoes: 'Visita reagendada duas vezes.',
    dataCadastro: '2026-05-10T10:00:00.000Z',
    visitasAgendadas: [{ imovelId: 'im-018', data: '2026-07-05T09:00:00.000Z' }],
    estado: 'SP', cidade: 'Ribeirão Preto', bairros: ['City Ribeirão'],
    tipos: ['sala_comercial'], valorDe: 260000, valorAte: 380000,
  }),
  construir({
    corretorResponsavelId: OUTROS[4], etapa: 3, nome: 'Guilherme Rocha',
    telefoneWhatsapp: '11992003030', origem: 'indicacao', observacoes: 'Confirmar horário de visita por WhatsApp.',
    dataCadastro: '2026-05-25T10:00:00.000Z',
    visitasAgendadas: [{ imovelId: 'im-023', data: '2026-07-06T15:00:00.000Z' }],
    estado: 'SP', cidade: 'São Paulo', bairros: ['Pinheiros'],
    tipos: ['apartamento'], valorDe: 1100000, valorAte: 1500000, elevador: true, lazer: true,
  }),
  construir({
    corretorResponsavelId: ANA, etapa: 3, nome: 'Renata Xavier',
    telefoneWhatsapp: '16993004040', origem: 'rede_social', observacoes: 'Quer levar o marido na segunda visita.',
    dataCadastro: '2026-06-01T10:00:00.000Z',
    visitasAgendadas: [{ imovelId: 'im-016', data: '2026-07-08T11:00:00.000Z' }],
    estado: 'SP', cidade: 'Ribeirão Preto', bairros: ['Jardim Canadá'],
    tipos: ['casa_condominio'], valorDe: 1700000, valorAte: 2000000, churrasqueira: true, aceitaPet: true,
  }),
  construir({
    corretorResponsavelId: OUTROS[6], etapa: 3, nome: 'Leandro Souza',
    telefoneWhatsapp: '19994005050', origem: 'site', observacoes: 'Cliente já fez proposta verbal em imóvel similar.',
    dataCadastro: '2026-05-28T10:00:00.000Z',
    visitasAgendadas: [{ imovelId: 'im-021', data: '2026-07-02T16:00:00.000Z' }],
    estado: 'SP', cidade: 'Campinas', bairros: ['Taquaral', 'Cambuí'],
    tipos: ['casa_rua'], valorDe: 420000, valorAte: 520000,
  }),

  // ============ ETAPA (4) — Em negociação — 5 (3 com múltiplas negociações) ============
  construir({
    corretorResponsavelId: ANA, etapa: 4, nome: 'Fernanda Lacerda',
    telefoneWhatsapp: '16995006060', origem: 'indicacao',
    dataCadastro: '2026-04-10T10:00:00.000Z',
    negociacoesAtivas: [
      { imovelId: 'im-024', dataInicio: '2026-06-05T10:00:00.000Z' },
      { imovelId: 'im-026', dataInicio: '2026-06-18T10:00:00.000Z' },
    ],
    estado: 'SP', cidade: 'Ribeirão Preto', bairros: ['Ribeirânia', 'Alto da Boa Vista'],
    tipos: ['apartamento'], valorDe: 550000, valorAte: 700000, quartosMin: 3,
  }),
  construir({
    corretorResponsavelId: ANA, etapa: 4, nome: 'Thiago Correia',
    telefoneWhatsapp: '16996007070', origem: 'site',
    dataCadastro: '2026-03-22T10:00:00.000Z',
    negociacoesAtivas: [
      { imovelId: 'im-026', dataInicio: '2026-05-18T10:00:00.000Z' },
      { imovelId: 'im-027', dataInicio: '2026-06-20T10:00:00.000Z' },
    ],
    estado: 'SP', cidade: 'Ribeirão Preto', bairros: ['Alto da Boa Vista', 'Jardim Botânico'],
    tipos: ['apartamento'], valorDe: 600000, valorAte: 750000, suitesMin: 1,
  }),
  construir({
    corretorResponsavelId: OUTROS[6], etapa: 4, nome: 'Aline Teixeira',
    telefoneWhatsapp: '19997008080', origem: 'indicacao',
    dataCadastro: '2026-04-02T10:00:00.000Z',
    negociacoesAtivas: [
      { imovelId: 'im-025', dataInicio: '2026-06-10T10:00:00.000Z' },
      { imovelId: 'im-024', dataInicio: '2026-06-22T10:00:00.000Z' },
    ],
    estado: 'SP', cidade: 'Campinas', bairros: ['Taquaral'],
    tipos: ['casa_rua'], valorDe: 450000, valorAte: 550000,
  }),
  construir({
    corretorResponsavelId: OUTROS[7], etapa: 4, nome: 'Douglas Pinheiro',
    telefoneWhatsapp: '16998009090', origem: 'site',
    dataCadastro: '2026-02-15T10:00:00.000Z',
    negociacoesAtivas: [{ imovelId: 'im-024', dataInicio: '2026-06-01T10:00:00.000Z' }],
    estado: 'SP', cidade: 'Ribeirão Preto', bairros: ['Ribeirânia', 'Alto da Boa Vista'],
    tipos: ['apartamento'], valorDe: 480000, valorAte: 620000,
  }),
  construir({
    corretorResponsavelId: ANA, etapa: 4, nome: 'Sabrina Melo',
    telefoneWhatsapp: '16999001010', origem: 'campanha_online',
    dataCadastro: '2026-03-30T10:00:00.000Z',
    negociacoesAtivas: [{ imovelId: 'im-027', dataInicio: '2026-06-15T10:00:00.000Z' }],
    estado: 'SP', cidade: 'São Carlos', bairros: ['Jardim Paulistano'],
    tipos: ['apartamento'], valorDe: 420000, valorAte: 500000,
  }),

  // ============ ETAPA (5) — Negócio Fechado — 2 ============
  construir({
    corretorResponsavelId: ANA, etapa: 5, nome: 'Carla Bittencourt',
    telefoneWhatsapp: '16991001100', origem: 'indicacao',
    dataCadastro: '2025-12-01T10:00:00.000Z',
    estado: 'SP', cidade: 'Ribeirão Preto', bairros: ['Centro'],
    tipos: ['apartamento'], valorDe: 380000, valorAte: 420000,
  }),
  construir({
    corretorResponsavelId: OUTROS[7], etapa: 5, nome: 'Rogério Assis',
    telefoneWhatsapp: '16992002200', origem: 'site',
    dataCadastro: '2025-11-10T10:00:00.000Z',
    estado: 'SP', cidade: 'Ribeirão Preto', bairros: ['Jardim Recreio'],
    tipos: ['casa_rua'], valorDe: 480000, valorAte: 540000,
  }),

  // ============ ETAPA (6) — Finalizado — 1 ============
  construir({
    corretorResponsavelId: ANA, etapa: 6, nome: 'Marcelo Guedes',
    telefoneWhatsapp: '16993003300', origem: 'relacionamento',
    dataCadastro: '2025-09-05T10:00:00.000Z',
    pagamentosConcluidos: true, chavesEntregues: true,
    estado: 'SP', cidade: 'Ribeirão Preto', bairros: ['Centro'],
    tipos: ['apartamento'], valorDe: 370000, valorAte: 410000,
  }),

  // ============ ETAPA (7) — Standby — 2 ============
  construir({
    corretorResponsavelId: ANA, etapa: 7, nome: 'Cliente 250',
    origem: 'campanha_online',
    dataCadastro: '2026-01-20T10:00:00.000Z',
    motivoStandby: 'Cliente adiou a compra para o próximo semestre por motivos financeiros.',
    meMantenhaInformado: true, dataEntradaStandby: '2026-05-01T10:00:00.000Z',
    estado: 'SP', cidade: 'Ribeirão Preto', bairros: ['Jardim Sumaré'],
    tipos: ['apartamento'], valorDe: 400000, valorAte: 500000,
  }),
  construir({
    corretorResponsavelId: OUTROS[3], etapa: 7, nome: 'Otacílio Nunes',
    telefoneWhatsapp: '19994005500', origem: 'indicacao',
    dataCadastro: '2026-02-01T10:00:00.000Z',
    motivoStandby: 'Aguardando aprovação de financiamento bancário.',
    meMantenhaInformado: false, dataEntradaStandby: '2026-04-15T10:00:00.000Z',
    estado: 'SP', cidade: 'Campinas', bairros: ['Jardim Chapadão'],
    tipos: ['terreno_condominio'], valorDe: null, valorAte: 480000,
  }),

  // ============ ETAPA (8) — Perdidos — 1 ============
  construir({
    corretorResponsavelId: ANA, etapa: 8, nome: 'Cliente 087',
    origem: 'rede_social',
    dataCadastro: '2025-10-10T10:00:00.000Z',
    motivoPerdido: 'Cliente fechou negócio com outro corretor fora da plataforma.',
    estado: 'SP', cidade: 'Ribeirão Preto', bairros: ['Alto do Ipiranga'],
    tipos: ['sala_comercial'], valorDe: null, valorAte: 320000,
  }),
]
