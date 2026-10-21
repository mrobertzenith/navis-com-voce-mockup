import type { Negociacao } from './types.ts'

// Extensão `.ts` explícita nos imports (aqui e onde este arquivo é importado):
// usado tanto pelo frontend (Vite) quanto pela Edge Function
// "ranking-corretores" (Deno, supabase/functions/ranking-corretores/index.ts)
// via caminho relativo — Deno exige extensão em imports locais. Mesmo padrão
// de domain/matching.ts.

export const PESO_VGV = 0.5
export const PESO_CONVERSAO = 0.3
export const PESO_COLABORACAO = 0.2

/** Só os campos de corretor que o cálculo realmente usa — não precisa do Corretor completo. */
export interface CorretorParaRanking {
  id: string
  nome: string
  cidade: string
  estado: string
}

/** Só os campos de venda que o cálculo usa (tabela `vendas`; no mock, derivados do imóvel vendido). */
export interface VendaParaRanking {
  corretorImovelId: string
  valorVenda: number
  dataVenda: string
  revertida?: boolean
}

export interface LinhaRanking {
  corretorId: string
  nome: string
  cidade: string
  estado: string
  vendas: number
  vgv: number
  conversao: number | null
  colaboracao: number | null
  score: number
}

// ---------- períodos ----------

export type TipoPeriodo = 'mes' | 'trimestre' | 'semestre' | 'ano' | 'tudo'

/** indice: mês 0–11, trimestre 0–3, semestre 0–1; ignorado em 'ano' e 'tudo'. */
export interface PeriodoRanking {
  tipo: TipoPeriodo
  ano: number
  indice: number
}

export interface LimitesPeriodo {
  /** inclusivo */
  inicio: string
  /** exclusivo */
  fim: string
}

const MESES_POR_TIPO: Record<Exclude<TipoPeriodo, 'ano' | 'tudo'>, number> = {
  mes: 1,
  trimestre: 3,
  semestre: 6,
}

/** Brasília é UTC−3 o ano todo (sem horário de verão desde 2019): 00h BRT = 03h UTC. */
function inicioBrasilia(ano: number, mes: number): string {
  return new Date(Date.UTC(ano, mes, 1, 3, 0, 0)).toISOString()
}

/**
 * Limites do período em horário de Brasília — uma venda de 31/out às 22h BRT
 * (01h UTC de 1/nov) conta em outubro, não em novembro. null = sem limite
 * ("tudo").
 */
export function limitesDoPeriodo(p: PeriodoRanking): LimitesPeriodo | null {
  if (p.tipo === 'tudo') return null
  if (p.tipo === 'ano') return { inicio: inicioBrasilia(p.ano, 0), fim: inicioBrasilia(p.ano + 1, 0) }
  const passo = MESES_POR_TIPO[p.tipo]
  const mesInicial = p.indice * passo
  return { inicio: inicioBrasilia(p.ano, mesInicial), fim: inicioBrasilia(p.ano, mesInicial + passo) }
}

/** Período válido? (a Edge Function recebe isso do cliente, então confere). */
export function periodoValido(p: unknown): p is PeriodoRanking {
  if (!p || typeof p !== 'object') return false
  const { tipo, ano, indice } = p as Record<string, unknown>
  if (!['mes', 'trimestre', 'semestre', 'ano', 'tudo'].includes(tipo as string)) return false
  if (tipo === 'tudo') return true
  if (!Number.isInteger(ano) || (ano as number) < 2020 || (ano as number) > 2100) return false
  if (tipo === 'ano') return true
  const max = { mes: 12, trimestre: 4, semestre: 2 }[tipo as 'mes' | 'trimestre' | 'semestre']
  return Number.isInteger(indice) && (indice as number) >= 0 && (indice as number) < max
}

function dentro(data: string | undefined, limites: LimitesPeriodo | null): boolean {
  if (!limites) return true
  if (!data) return false
  return data >= limites.inicio && data < limites.fim
}

/**
 * VGV executado = soma das vendas confirmadas e não revertidas (tabela
 * `vendas`), atribuída ao corretor dono do imóvel, dentro do período. Antes
 * somava `imoveis.valor_venda`, que o trigger de venda nunca preenche — com
 * vendas reais o ranking sairia zerado (achado de 20/10/2026).
 *
 * Conversão (concluídas / concluídas+revertidas — "ativa" ainda está em
 * aberto) e colaboração (das concluídas, quantas com cliente de OUTRO
 * corretor) só entram no "score" composto, visão de admin. Filtro por
 * estado/cidade e ordenação por modo ficam no cliente — são apresentação.
 */
export function calcularRanking(
  corretores: CorretorParaRanking[],
  vendas: VendaParaRanking[],
  negociacoes: Negociacao[],
  limites: LimitesPeriodo | null = null,
): LinhaRanking[] {
  const porCorretor = new Map<string, { vendas: number; vgv: number }>()
  for (const v of vendas) {
    if (v.revertida || !dentro(v.dataVenda, limites)) continue
    const atual = porCorretor.get(v.corretorImovelId) ?? { vendas: 0, vgv: 0 }
    atual.vendas += 1
    atual.vgv += v.valorVenda
    porCorretor.set(v.corretorImovelId, atual)
  }

  const decididas = new Map<string, { concluidas: number; revertidas: number; colaborativas: number }>()
  for (const n of negociacoes) {
    if (n.status !== 'concluida' && n.status !== 'revertida') continue
    if (!dentro(n.dataFim, limites)) continue
    const atual = decididas.get(n.corretorImovelId) ?? { concluidas: 0, revertidas: 0, colaborativas: 0 }
    if (n.status === 'concluida') {
      atual.concluidas += 1
      if (n.corretorClienteId && n.corretorClienteId !== n.corretorImovelId) atual.colaborativas += 1
    } else {
      atual.revertidas += 1
    }
    decididas.set(n.corretorImovelId, atual)
  }

  const maiorVgv = Math.max(0, ...Array.from(porCorretor.values()).map((v) => v.vgv))

  return corretores.map((c) => {
    const vendasN = porCorretor.get(c.id)?.vendas ?? 0
    const vgv = porCorretor.get(c.id)?.vgv ?? 0
    const d = decididas.get(c.id)
    const totalDecididas = (d?.concluidas ?? 0) + (d?.revertidas ?? 0)
    const conversao = totalDecididas > 0 ? (d!.concluidas / totalDecididas) * 100 : null
    const colaboracao = d && d.concluidas > 0 ? (d.colaborativas / d.concluidas) * 100 : null
    const vgvNorm = maiorVgv > 0 ? (vgv / maiorVgv) * 100 : 0
    const score = PESO_VGV * vgvNorm + PESO_CONVERSAO * (conversao ?? 0) + PESO_COLABORACAO * (colaboracao ?? 0)
    return {
      corretorId: c.id, nome: c.nome, cidade: c.cidade, estado: c.estado,
      vendas: vendasN, vgv, conversao, colaboracao, score,
    }
  })
}

/** Visão pública: só vendas e VGV — conversão/colaboração/score são gerenciais (admin). */
export function paraVisaoPublica(linhas: LinhaRanking[]): LinhaRanking[] {
  return linhas.map((l) => ({ ...l, conversao: null, colaboracao: null, score: 0 }))
}
