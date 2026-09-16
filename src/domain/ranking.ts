import type { Imovel, Negociacao } from './types.ts'

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

/**
 * Ranking só por VGV bruto premia ticket alto, não qualidade nem trabalho em
 * equipe (achado de auditoria, 14/09/2026) — mas o PO quer manter essa visão
 * como opção (decisão de produto, 15/09/2026), não substituí-la (ver o toggle
 * em RankingCorretoresPage.tsx). As duas colunas de apoio usam só dado que já
 * existe (sem migração nova): taxa de conversão (negociações concluídas /
 * concluídas+revertidas — "ativa" ainda está em aberto) e colaboração (das
 * vendas concluídas, quantas fecharam com cliente de OUTRO corretor). O
 * "score" pondera as três; filtro por estado/cidade e ordenação por modo
 * ("Só VGV" vs. "Score composto") ficam no cliente — são apresentação, não
 * parte do cálculo.
 */
export function calcularRanking(
  corretores: CorretorParaRanking[],
  imoveis: Imovel[],
  negociacoes: Negociacao[],
): LinhaRanking[] {
  const vendidos = imoveis.filter((i) => i.etapa === 'f')
  const porCorretor = new Map<string, { vendas: number; vgv: number }>()
  for (const imovel of vendidos) {
    const atual = porCorretor.get(imovel.corretorResponsavelId) ?? { vendas: 0, vgv: 0 }
    atual.vendas += 1
    atual.vgv += imovel.valorVenda ?? 0
    porCorretor.set(imovel.corretorResponsavelId, atual)
  }

  const decididas = new Map<string, { concluidas: number; revertidas: number; colaborativas: number }>()
  for (const n of negociacoes) {
    if (n.status !== 'concluida' && n.status !== 'revertida') continue
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
    const vendas = porCorretor.get(c.id)?.vendas ?? 0
    const vgv = porCorretor.get(c.id)?.vgv ?? 0
    const d = decididas.get(c.id)
    const totalDecididas = (d?.concluidas ?? 0) + (d?.revertidas ?? 0)
    const conversao = totalDecididas > 0 ? (d!.concluidas / totalDecididas) * 100 : null
    const colaboracao = d && d.concluidas > 0 ? (d.colaborativas / d.concluidas) * 100 : null
    const vgvNorm = maiorVgv > 0 ? (vgv / maiorVgv) * 100 : 0
    const score = PESO_VGV * vgvNorm + PESO_CONVERSAO * (conversao ?? 0) + PESO_COLABORACAO * (colaboracao ?? 0)
    return { corretorId: c.id, nome: c.nome, cidade: c.cidade, estado: c.estado, vendas, vgv, conversao, colaboracao, score }
  })
}
