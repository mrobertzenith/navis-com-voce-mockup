import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { imovelParaRow, leadParaRow, negociacaoParaRow, perfilParaRow, vendaParaRow } from '@/lib/supabaseMap'
import type { Imovel, Lead, Negociacao, PerfilBusca, Venda } from '@/domain/types'

/**
 * Estes testes existem por causa de dois bugs reais em produção: o app enviava
 * null para uma coluna obrigatória do banco (fotos, depois visitas_agendadas),
 * o banco recusava a gravação e o erro passava despercebido — o botão
 * simplesmente não fazia nada.
 *
 * A regra travada aqui: nenhum payload dos fluxos do app pode produzir null
 * numa coluna NOT NULL. As colunas são lidas das próprias migrações, para o
 * teste continuar valendo quando o schema mudar.
 */

const DIR_MIGRACOES = join(process.cwd(), 'supabase/migrations')

/** Colunas NOT NULL por tabela, extraídas do schema versionado */
function colunasObrigatorias(): Record<string, Set<string>> {
  const sql = readdirSync(DIR_MIGRACOES)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(DIR_MIGRACOES, f), 'utf8'))
    .join('\n')

  const porTabela: Record<string, Set<string>> = {}

  // create table <nome> ( ... )
  for (const m of sql.matchAll(/create table (\w+)\s*\(([\s\S]*?)\n\);/g)) {
    const tabela = m[1]
    porTabela[tabela] ??= new Set()
    for (const linha of m[2].split('\n')) {
      const col = linha.trim().match(/^(\w+)\s+.*\bnot null\b/i)
      if (col) porTabela[tabela].add(col[1])
    }
  }

  // alter table <nome> add column <col> ... not null
  for (const m of sql.matchAll(/alter table (\w+)\s+add column (\w+)[^;]*?\bnot null\b/gi)) {
    porTabela[m[1]] ??= new Set()
    porTabela[m[1]].add(m[2])
  }

  // alter table <nome> drop column [if exists] <col>
  for (const m of sql.matchAll(/alter table (\w+)\s+drop column(?:\s+if exists)?\s+(\w+)/gi)) {
    porTabela[m[1]]?.delete(m[2])
  }

  return porTabela
}

const OBRIGATORIAS = colunasObrigatorias()

function checarNulos(tabela: string, row: Record<string, unknown>) {
  const obrigatorias = OBRIGATORIAS[tabela]
  const violacoes = Object.entries(row)
    .filter(([coluna, valor]) => valor === null && obrigatorias.has(coluna))
    .map(([coluna]) => coluna)
  return violacoes
}

describe('schema lido das migrações', () => {
  it('encontrou as colunas obrigatórias das tabelas que o app escreve', () => {
    // se o parser falhar, os testes abaixo passariam sem verificar nada
    expect(OBRIGATORIAS.imoveis?.size ?? 0).toBeGreaterThan(5)
    expect(OBRIGATORIAS.leads?.size ?? 0).toBeGreaterThan(3)
    expect(OBRIGATORIAS.perfis_busca?.size ?? 0).toBeGreaterThan(2)
  })

  it('reflete as mudanças de schema já aplicadas', () => {
    expect(OBRIGATORIAS.imoveis.has('diferenciais_extras')).toBe(true) // migração 7 adicionou
    expect(OBRIGATORIAS.imoveis.has('fotos')).toBe(false) // migração 7 removeu
    expect(OBRIGATORIAS.leads.has('visitas_agendadas')).toBe(true) // origem do bug do cliente
  })
})

describe('imóvel — payloads dos fluxos reais', () => {
  const base: Omit<Imovel, 'id' | 'criadoEm' | 'atualizadoEm'> = {
    corretorResponsavelId: 'c1',
    etapa: 'a',
    enderecoRua: 'Rua Teste',
    enderecoNumero: '1',
    bairro: 'Centro',
    cidade: 'Ribeirão Preto',
    estado: 'SP',
    cep: '',
    lat: 0,
    lng: 0,
    tipo: 'apartamento',
    quartos: 0,
    suites: 0,
    vagas: 0,
    banheiros: 0,
    emNegociacaoFlag: false,
  }

  it('cadastro mínimo (nenhum campo opcional preenchido)', () => {
    expect(checarNulos('imoveis', imovelParaRow(base))).toEqual([])
  })

  it('cadastro com todos os opcionais vazios explicitamente', () => {
    const comVazios = {
      ...base,
      cnm: undefined,
      nomeCondominio: undefined,
      valorEstimado: undefined,
      areaPrivativaM2: undefined,
      diferenciaisExtras: [],
      elevador: undefined,
    }
    expect(checarNulos('imoveis', imovelParaRow(comVazios))).toEqual([])
  })

  it('mover no Kanban (patch de etapa)', () => {
    expect(checarNulos('imoveis', imovelParaRow({ etapa: 'e', emNegociacaoFlag: true }))).toEqual([])
    expect(checarNulos('imoveis', imovelParaRow({ etapa: 'd', emNegociacaoFlag: false }))).toEqual([])
  })

  it('diferenciais livres ausentes não viram null', () => {
    const row = imovelParaRow({ ...base, diferenciaisExtras: undefined })
    expect(row.diferenciais_extras).not.toBeNull()
    expect(checarNulos('imoveis', row)).toEqual([])
  })
})

describe('cliente — payloads dos fluxos reais', () => {
  const perfil: PerfilBusca = {
    id: '',
    leadId: '',
    estado: 'SP',
    cidade: 'Ribeirão Preto',
    bairros: ['Centro'],
    raioKm: 5,
    tipos: ['apartamento'],
    valorDe: 200000,
    valorAte: 500000,
  }

  it('cadastro na etapa "Novo Cliente" — o caso que quebrava', () => {
    const payload: Omit<Lead, 'id' | 'codigo' | 'dataCadastro'> = {
      corretorResponsavelId: 'c1',
      etapa: 1,
      nome: 'Fulano',
      email: undefined,
      telefoneWhatsapp: undefined,
      origem: undefined,
      observacoes: undefined,
      visitasAgendadas: undefined, // ← era convertido em null e o banco recusava
      perfilBusca: perfil,
    }
    const row = leadParaRow(payload)
    expect(row.visitas_agendadas).not.toBeNull()
    expect(checarNulos('leads', row)).toEqual([])
  })

  it('cadastro direto em "Visita agendada" (com visitas)', () => {
    const row = leadParaRow({
      corretorResponsavelId: 'c1',
      etapa: 3,
      nome: 'Fulano',
      visitasAgendadas: [{ imovelId: 'i1', data: '2026-09-10' }],
      perfilBusca: perfil,
    } as Omit<Lead, 'id' | 'codigo' | 'dataCadastro'>)
    expect(checarNulos('leads', row)).toEqual([])
  })

  it('mover no Kanban com lista de pendentes de aprovação', () => {
    expect(checarNulos('leads', leadParaRow({ etapa: 4, pendenteAprovacaoImoveis: [] }))).toEqual([])
  })

  it('patch com lista ausente (undefined) não vira null', () => {
    const row = leadParaRow({ etapa: 3, pendenteAprovacaoImoveis: undefined })
    expect(row.pendente_aprovacao_imoveis).not.toBeNull()
    expect(checarNulos('leads', row)).toEqual([])
  })

  // negociacoesAtivas/imovelFechadoId/valorNegociado/pagamentosConcluidos/
  // chavesEntregues saíram de LEAD_CAMPOS de propósito — são calculados a
  // partir de negociacoes/vendas na leitura, não gravados em leads. Este
  // teste garante que ninguém readicione essas colunas por engano.
  it('negociacoesAtivas e afins não são mais colunas de leads', () => {
    const row = leadParaRow({
      etapa: 4,
      negociacoesAtivas: [{ imovelId: 'im-1', dataInicio: '2026-01-01' }],
      imovelFechadoId: 'im-1',
      valorNegociado: 500000,
      pagamentosConcluidos: true,
      chavesEntregues: true,
    } as Partial<Lead>)
    expect(row).not.toHaveProperty('negociacoes_ativas')
    expect(row).not.toHaveProperty('imovel_fechado_id')
    expect(row).not.toHaveProperty('valor_negociado')
    expect(row).not.toHaveProperty('pagamentos_concluidos')
    expect(row).not.toHaveProperty('chaves_entregues')
  })

  it('perfil de busca sem CEP nem coordenadas', () => {
    expect(checarNulos('perfis_busca', perfilParaRow(perfil))).toEqual([])
  })

  it('perfil de busca com listas vazias', () => {
    const row = perfilParaRow({ ...perfil, bairros: [], tipos: [], cep: undefined, lat: undefined })
    expect(checarNulos('perfis_busca', row)).toEqual([])
  })

  // negociacoes/vendas: tabelas existentes desde a primeira migração, só
  // passaram a ser escritas de verdade na migração dos hooks useNegociacoes —
  // mesma proteção contra null em coluna obrigatória que já pegou dois bugs
  // reais antes (ver comentário no topo do arquivo).
  it('nova negociação, só com os campos obrigatórios', () => {
    const negociacao: Omit<Negociacao, 'id'> = {
      imovelId: 'im-1',
      corretorImovelId: 'cor-1',
      dataInicio: '2026-01-01T00:00:00.000Z',
      status: 'ativa',
    }
    expect(checarNulos('negociacoes', negociacaoParaRow(negociacao))).toEqual([])
  })

  it('nova venda, só com os campos obrigatórios', () => {
    const venda: Omit<Venda, 'id'> = {
      imovelId: 'im-1',
      corretorImovelId: 'cor-1',
      valorVenda: 500000,
      dataVenda: '2026-01-01T00:00:00.000Z',
      revertida: false,
      pagamentosConcluidos: false,
      chavesEntregues: false,
    }
    expect(checarNulos('vendas', vendaParaRow(venda))).toEqual([])
  })
})

describe('campos opcionais continuam podendo ser limpos', () => {
  it('limpar um campo opcional ainda envia null (comportamento esperado)', () => {
    // a proteção vale só para colunas obrigatórias; o resto precisa poder ser apagado
    const row = imovelParaRow({ cnm: undefined, observacoes: undefined })
    expect(row.cnm).toBeNull()
    expect(row.observacoes).toBeNull()
  })
})
