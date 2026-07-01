import type { EtapaLead, Lead, OrigemLead, TipoImovel } from '@/domain/types'
import { CORRETOR_LOGADO_ID } from '@/mocks/data/corretores'

let seq = 2400
function proximoCodigo(): string {
  seq += 1
  return `Lead #${seq}`
}

interface LeadSeed {
  corretorResponsavelId: string
  etapa: EtapaLead
  nome: string
  email?: string
  telefoneWhatsapp?: string
  origem?: OrigemLead
  observacoes?: string
  dataCadastro: string
  dataVisita?: string
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

function construir(seed: LeadSeed): Lead {
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
    dataVisita: seed.dataVisita,
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

export const LEADS_SEED: Lead[] = [
  // --- etapa (1) — Novo Lead ---
  construir({
    corretorResponsavelId: ANA, etapa: 1, nome: 'Rafael Tavares',
    telefoneWhatsapp: '16991110001', origem: 'site',
    dataCadastro: '2026-06-25T10:00:00.000Z',
    estado: 'SP', cidade: 'Ribeirão Preto', bairros: ['Jardim Irajá', 'Jardim Sumaré'],
    tipos: ['apartamento'], valorDe: 380000, valorAte: 500000, quartosMin: 2,
  }),
  construir({
    corretorResponsavelId: OUTROS[0], etapa: 1, nome: 'Juliana Prado',
    telefoneWhatsapp: '19992220002', origem: 'indicacao',
    dataCadastro: '2026-06-28T10:00:00.000Z',
    estado: 'SP', cidade: 'Campinas', bairros: ['Cambuí', 'Nova Campinas'],
    tipos: ['casa_condominio'], valorDe: 700000, valorAte: 1000000, quartosMin: 3,
  }),
  construir({
    corretorResponsavelId: ANA, etapa: 1, nome: 'Cliente 118',
    origem: 'rede_social',
    dataCadastro: '2026-06-29T10:00:00.000Z',
    estado: 'SP', cidade: 'São Carlos', bairros: ['Centro'],
    tipos: ['sala_comercial'], valorDe: null, valorAte: 320000,
  }),

  // --- etapa (2) — Em contato ---
  construir({
    corretorResponsavelId: ANA, etapa: 2, nome: 'Marcos Vinícius Lopes',
    telefoneWhatsapp: '16993330003', origem: 'indicacao', observacoes: 'Cliente quer visitar em duas semanas, prefere ligação.',
    dataCadastro: '2026-06-10T10:00:00.000Z',
    estado: 'SP', cidade: 'Ribeirão Preto', bairros: ['Alto da Boa Vista', 'Ribeirânia'],
    tipos: ['apartamento'], valorDe: 500000, valorAte: 650000, quartosMin: 3, suitesMin: 1,
  }),
  construir({
    corretorResponsavelId: ANA, etapa: 2, nome: 'Beatriz Nogueira',
    telefoneWhatsapp: '16994440004', origem: 'campanha_online', observacoes: 'Já visitou similar em outro bairro, procurando elevador.',
    dataCadastro: '2026-06-12T10:00:00.000Z',
    estado: 'SP', cidade: 'Ribeirão Preto', bairros: ['Jardim Sumaré', 'Jardim Botânico'],
    tipos: ['apartamento'], valorDe: 400000, valorAte: 650000, elevador: true,
  }),
  construir({
    corretorResponsavelId: OUTROS[1], etapa: 2, nome: 'Rodrigo Farias',
    telefoneWhatsapp: '11995550005', origem: 'site', observacoes: 'Trabalha na região de Pinheiros, busca mobiliado.',
    dataCadastro: '2026-06-08T10:00:00.000Z',
    estado: 'SP', cidade: 'São Paulo', bairros: ['Pinheiros', 'Perdizes'],
    tipos: ['apartamento'], valorDe: 900000, valorAte: 1300000, mobiliado: true,
  }),
  construir({
    corretorResponsavelId: OUTROS[2], etapa: 2, nome: 'Tatiane Cardoso',
    telefoneWhatsapp: '16996660006', origem: 'relacionamento', observacoes: 'Família com pet, precisa aceitar animais.',
    dataCadastro: '2026-06-15T10:00:00.000Z',
    estado: 'SP', cidade: 'Franca', bairros: ['Centro', 'Jardim América'],
    tipos: ['casa_rua'], valorDe: 300000, valorAte: 420000, aceitaPet: true,
  }),
  construir({
    corretorResponsavelId: ANA, etapa: 2, nome: 'Cliente 402',
    origem: 'campanha_offline', observacoes: 'Prefere anonimato neste momento, contato só por e-mail.',
    email: 'cliente402@exemplo.com',
    dataCadastro: '2026-06-18T10:00:00.000Z',
    estado: 'SP', cidade: 'São Carlos', bairros: ['Jardim Paulistano', 'Vila Nery'],
    tipos: ['casa_condominio'], valorDe: 600000, valorAte: 800000, lazer: true,
  }),
  construir({
    corretorResponsavelId: OUTROS[3], etapa: 2, nome: 'Eduardo Vasconcelos',
    telefoneWhatsapp: '19997770007', origem: 'site', observacoes: 'Investidor, procura terrenos para futura construção.',
    dataCadastro: '2026-06-05T10:00:00.000Z',
    estado: 'SP', cidade: 'Campinas', bairros: ['Jardim Chapadão', 'Nova Campinas'],
    tipos: ['terreno_condominio', 'terreno_rua'], valorDe: null, valorAte: 400000,
  }),

  // --- etapa (3) — Visita agendada ---
  construir({
    corretorResponsavelId: ANA, etapa: 3, nome: 'Camila Duarte',
    telefoneWhatsapp: '16998880008', origem: 'indicacao', observacoes: 'Visita marcada para o fim de semana.',
    dataCadastro: '2026-05-20T10:00:00.000Z', dataVisita: '2026-07-04T14:00:00.000Z',
    estado: 'SP', cidade: 'Ribeirão Preto', bairros: ['Jardim Sumaré'],
    tipos: ['apartamento'], valorDe: 420000, valorAte: 520000, quartosMin: 3, vagasMin: 2,
  }),
  construir({
    corretorResponsavelId: ANA, etapa: 3, nome: 'Vinícius Andrade',
    telefoneWhatsapp: '16999990009', origem: 'site', observacoes: 'Segunda visita, já viu duas opções.',
    dataCadastro: '2026-05-15T10:00:00.000Z', dataVisita: '2026-07-03T10:00:00.000Z',
    estado: 'SP', cidade: 'Ribeirão Preto', bairros: ['Jardim Botânico', 'Ribeirânia'],
    tipos: ['apartamento'], valorDe: 550000, valorAte: 700000, suitesMin: 2, lazer: true,
  }),
  construir({
    corretorResponsavelId: OUTROS[4], etapa: 3, nome: 'Priscila Mendes',
    telefoneWhatsapp: '16990001010', origem: 'campanha_online', observacoes: 'Visita reagendada duas vezes.',
    dataCadastro: '2026-05-10T10:00:00.000Z', dataVisita: '2026-07-05T09:00:00.000Z',
    estado: 'SP', cidade: 'Franca', bairros: ['Jardim Guanabara'],
    tipos: ['apartamento'], valorDe: 260000, valorAte: 340000,
  }),
  construir({
    corretorResponsavelId: OUTROS[5], etapa: 3, nome: 'Guilherme Rocha',
    telefoneWhatsapp: '11991002020', origem: 'indicacao', observacoes: 'Confirmar horário de visita por WhatsApp.',
    dataCadastro: '2026-05-25T10:00:00.000Z', dataVisita: '2026-07-06T15:00:00.000Z',
    estado: 'SP', cidade: 'São Paulo', bairros: ['Vila Mariana', 'Moema'],
    tipos: ['apartamento'], valorDe: 800000, valorAte: 950000, elevador: true, lazer: true,
  }),
  construir({
    corretorResponsavelId: ANA, etapa: 3, nome: 'Renata Xavier',
    telefoneWhatsapp: '16992003030', origem: 'rede_social', observacoes: 'Quer levar o marido na segunda visita.',
    dataCadastro: '2026-06-01T10:00:00.000Z', dataVisita: '2026-07-08T11:00:00.000Z',
    estado: 'SP', cidade: 'São Carlos', bairros: ['Jardim Paulistano'],
    tipos: ['casa_condominio'], valorDe: 650000, valorAte: 780000, churrasqueira: true, aceitaPet: true,
  }),
  construir({
    corretorResponsavelId: OUTROS[6], etapa: 3, nome: 'Leandro Souza',
    telefoneWhatsapp: '19993004040', origem: 'site', observacoes: 'Cliente já fez proposta verbal em imóvel similar.',
    dataCadastro: '2026-05-28T10:00:00.000Z', dataVisita: '2026-07-02T16:00:00.000Z',
    estado: 'SP', cidade: 'Campinas', bairros: ['Botafogo', 'Cambuí'],
    tipos: ['casa_rua'], valorDe: 420000, valorAte: 520000,
  }),

  // --- etapa (4) — Em negociação ---
  construir({
    corretorResponsavelId: ANA, etapa: 4, nome: 'Fernanda Lacerda',
    telefoneWhatsapp: '16993005050', origem: 'indicacao',
    dataCadastro: '2026-04-10T10:00:00.000Z',
    negociacoesAtivas: [{ imovelId: 'im-021', dataInicio: '2026-06-05T10:00:00.000Z' }],
    estado: 'SP', cidade: 'Ribeirão Preto', bairros: ['Ribeirânia'],
    tipos: ['apartamento'], valorDe: 500000, valorAte: 600000, quartosMin: 3,
  }),
  construir({
    corretorResponsavelId: ANA, etapa: 4, nome: 'Thiago Correia',
    telefoneWhatsapp: '16994006060', origem: 'site',
    dataCadastro: '2026-03-22T10:00:00.000Z',
    negociacoesAtivas: [
      { imovelId: 'im-023', dataInicio: '2026-05-18T10:00:00.000Z' },
      { imovelId: 'im-030', dataInicio: '2026-06-20T10:00:00.000Z' },
    ],
    estado: 'SP', cidade: 'Ribeirão Preto', bairros: ['Alto da Boa Vista', 'Jardim Botânico'],
    tipos: ['apartamento'], valorDe: 550000, valorAte: 700000, suitesMin: 1,
  }),
  construir({
    corretorResponsavelId: OUTROS[6], etapa: 4, nome: 'Aline Teixeira',
    telefoneWhatsapp: '19995007070', origem: 'indicacao',
    dataCadastro: '2026-04-02T10:00:00.000Z',
    negociacoesAtivas: [{ imovelId: 'im-022', dataInicio: '2026-06-10T10:00:00.000Z' }],
    estado: 'SP', cidade: 'Campinas', bairros: ['Botafogo'],
    tipos: ['casa_rua'], valorDe: 450000, valorAte: 550000,
  }),
  construir({
    corretorResponsavelId: OUTROS[7], etapa: 4, nome: 'Douglas Pinheiro',
    telefoneWhatsapp: '16996008080', origem: 'site',
    dataCadastro: '2026-02-15T10:00:00.000Z',
    negociacoesAtivas: [{ imovelId: 'im-021', dataInicio: '2026-06-01T10:00:00.000Z' }],
    estado: 'SP', cidade: 'Ribeirão Preto', bairros: ['Ribeirânia', 'Alto da Boa Vista'],
    tipos: ['apartamento'], valorDe: 480000, valorAte: 620000,
  }),
  construir({
    corretorResponsavelId: ANA, etapa: 4, nome: 'Sabrina Melo',
    telefoneWhatsapp: '16997009090', origem: 'campanha_online',
    dataCadastro: '2026-03-30T10:00:00.000Z',
    negociacoesAtivas: [{ imovelId: 'im-030', dataInicio: '2026-06-15T10:00:00.000Z' }],
    estado: 'SP', cidade: 'São Carlos', bairros: ['Jardim Botânico'],
    tipos: ['apartamento'], valorDe: 420000, valorAte: 500000,
  }),

  // --- etapa (5) — Negócio Fechado ---
  construir({
    corretorResponsavelId: ANA, etapa: 5, nome: 'Carla Bittencourt',
    telefoneWhatsapp: '16998001100', origem: 'indicacao',
    dataCadastro: '2025-12-01T10:00:00.000Z',
    estado: 'SP', cidade: 'Ribeirão Preto', bairros: ['Centro'],
    tipos: ['apartamento'], valorDe: 380000, valorAte: 420000,
  }),
  construir({
    corretorResponsavelId: OUTROS[7], etapa: 5, nome: 'Rogério Assis',
    telefoneWhatsapp: '16999002200', origem: 'site',
    dataCadastro: '2025-11-10T10:00:00.000Z',
    estado: 'SP', cidade: 'Franca', bairros: ['Vila Aparecida'],
    tipos: ['casa_rua'], valorDe: 320000, valorAte: 360000,
  }),

  // --- etapa (6) — Finalizado ---
  construir({
    corretorResponsavelId: ANA, etapa: 6, nome: 'Marcelo Guedes',
    telefoneWhatsapp: '16990003300', origem: 'relacionamento',
    dataCadastro: '2025-09-05T10:00:00.000Z',
    pagamentosConcluidos: true, chavesEntregues: true,
    estado: 'SP', cidade: 'Ribeirão Preto', bairros: ['Centro'],
    tipos: ['apartamento'], valorDe: 370000, valorAte: 410000,
  }),
  construir({
    corretorResponsavelId: OUTROS[5], etapa: 6, nome: 'Vanessa Cunha',
    telefoneWhatsapp: '19991004400', origem: 'site',
    dataCadastro: '2025-08-18T10:00:00.000Z',
    pagamentosConcluidos: true, chavesEntregues: true,
    estado: 'SP', cidade: 'Campinas', bairros: ['Cambuí'],
    tipos: ['apartamento'], valorDe: 680000, valorAte: 730000,
  }),

  // --- etapa (7) — Standby ---
  construir({
    corretorResponsavelId: ANA, etapa: 7, nome: 'Cliente 250',
    origem: 'campanha_online',
    dataCadastro: '2026-01-20T10:00:00.000Z',
    motivoStandby: 'Cliente adiou a compra para o próximo semestre por motivos financeiros.',
    meMantenhaInformado: true, dataEntradaStandby: '2026-05-01T10:00:00.000Z',
    estado: 'SP', cidade: 'Ribeirão Preto', bairros: ['Jardim Irajá'],
    tipos: ['apartamento'], valorDe: 400000, valorAte: 500000,
  }),
  construir({
    corretorResponsavelId: OUTROS[3], etapa: 7, nome: 'Otacílio Nunes',
    telefoneWhatsapp: '19992005500', origem: 'indicacao',
    dataCadastro: '2026-02-01T10:00:00.000Z',
    motivoStandby: 'Aguardando aprovação de financiamento bancário.',
    meMantenhaInformado: false, dataEntradaStandby: '2026-04-15T10:00:00.000Z',
    estado: 'SP', cidade: 'Campinas', bairros: ['Jardim Chapadão'],
    tipos: ['terreno_condominio'], valorDe: null, valorAte: 380000,
  }),

  // --- etapa (8) — Perdidos ---
  construir({
    corretorResponsavelId: ANA, etapa: 8, nome: 'Cliente 087',
    origem: 'rede_social',
    dataCadastro: '2025-10-10T10:00:00.000Z',
    motivoPerdido: 'Cliente fechou negócio com outro corretor fora da plataforma.',
    estado: 'SP', cidade: 'São Carlos', bairros: ['Centro'],
    tipos: ['sala_comercial'], valorDe: null, valorAte: 300000,
  }),
  construir({
    corretorResponsavelId: OUTROS[1], etapa: 8, nome: 'Wagner Teles',
    telefoneWhatsapp: '11993006600', origem: 'site',
    dataCadastro: '2025-11-22T10:00:00.000Z',
    motivoPerdido: 'Perdeu o interesse após mudança de emprego para outra cidade.',
    estado: 'SP', cidade: 'São Paulo', bairros: ['Tatuapé'],
    tipos: ['apartamento'], valorDe: 500000, valorAte: 600000,
  }),
]
