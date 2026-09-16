import { useMemo, useState } from 'react'
import { Trophy } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import { useImoveis } from '@/hooks/useImoveis'
import { useNegociacoes } from '@/hooks/useNegociacoes'
import { CORRETORES, CORRETOR_LOGADO_ID } from '@/mocks/data/corretores'
import { formatPreco } from '@/lib/format'
import { cn } from '@/lib/cn'

interface LinhaRanking {
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

const PESO_VGV = 0.5
const PESO_CONVERSAO = 0.3
const PESO_COLABORACAO = 0.2

/**
 * Ranking só por VGV bruto premia ticket alto, não qualidade nem trabalho em
 * equipe (achado de auditoria, 14/09/2026). O composto abaixo usa só dado que
 * já existe (sem migração nova): VGV normalizado pelo maior da lista, taxa de
 * conversão (negociações concluídas / concluídas+revertidas — "ativa" ainda
 * está em aberto, não conta nem a favor nem contra) e colaboração (das vendas
 * concluídas, quantas fecharam com cliente de OUTRO corretor — o diferencial
 * do produto é a carteira coletiva, então isso deveria contar pra ranking).
 * Pesos e as 3 colunas ficam visíveis na tabela de propósito: um score
 * "caixa-preta" só trocaria um viés (ticket alto) por outro (fórmula oculta).
 */
export function RankingCorretoresPage() {
  const { data: imoveis = [], isLoading: carregandoImoveis } = useImoveis()
  const { data: negociacoes = [], isLoading: carregandoNegociacoes } = useNegociacoes()
  const isLoading = carregandoImoveis || carregandoNegociacoes
  const [estado, setEstado] = useState<string>('')
  const [cidade, setCidade] = useState<string>('')

  const estados = useMemo(
    () => Array.from(new Set(CORRETORES.map((c) => c.estado))).sort(),
    [],
  )
  const cidades = useMemo(
    () =>
      Array.from(
        new Set(CORRETORES.filter((c) => !estado || c.estado === estado).map((c) => c.cidade)),
      ).sort(),
    [estado],
  )

  const ranking: LinhaRanking[] = useMemo(() => {
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

    return CORRETORES.filter((c) => (!estado || c.estado === estado) && (!cidade || c.cidade === cidade))
      .map((c) => {
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
      .sort((a, b) => b.score - a.score || b.vgv - a.vgv)
  }, [imoveis, negociacoes, estado, cidade])

  if (isLoading) {
    return <div className="p-6 text-sm text-text-mut">Carregando ranking…</div>
  }

  return (
    <div className="p-6">
      <h1 className="mb-1 text-xl font-bold">Ranking de Corretores</h1>
      <p className="mb-4 text-sm text-text-mut">
        Score composto — {PESO_VGV * 100}% VGV vendido, {PESO_CONVERSAO * 100}% taxa de conversão
        (negociações concluídas vs. revertidas) e {PESO_COLABORACAO * 100}% colaboração (vendas
        fechadas com cliente de outro corretor). Ticket alto sozinho não garante o topo. Ajuste os
        filtros para ver o ranking por cidade ou estado.
      </p>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label>Estado</Label>
          <Select
            value={estado || 'todos'}
            onValueChange={(v) => {
              setEstado(v === 'todos' ? '' : v)
              setCidade('')
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos (ranking geral)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos (ranking geral)</SelectItem>
              {estados.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Cidade</Label>
          <Select value={cidade || 'todas'} onValueChange={(v) => setCidade(v === 'todas' ? '' : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {cidades.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {ranking.length === 0 ? (
        <EmptyState title="Nenhum corretor encontrado" description="Ajuste os filtros para ver mais resultados." />
      ) : (
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg text-xs uppercase tracking-wide text-text-mut">
              <tr>
                <th className="px-4 py-3">Posição</th>
                <th className="px-4 py-3">Corretor</th>
                <th className="px-4 py-3">Cidade</th>
                <th className="px-4 py-3">VGV vendido</th>
                <th className="px-4 py-3">Vendas</th>
                <th className="px-4 py-3">Conversão</th>
                <th className="px-4 py-3">Colaboração</th>
                <th className="px-4 py-3">Score</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((linha, i) => (
                <tr
                  key={linha.corretorId}
                  className={cn(
                    'border-t border-border',
                    linha.corretorId === CORRETOR_LOGADO_ID && 'bg-primary/5',
                  )}
                >
                  <td className="px-4 py-3 font-mono">
                    <span className="inline-flex items-center gap-1.5">
                      {i < 3 && linha.score > 0 && (
                        <Trophy
                          className={cn(
                            'h-3.5 w-3.5',
                            i === 0 && 'text-warning',
                            i === 1 && 'text-text-soft',
                            i === 2 && 'text-danger/70',
                          )}
                          strokeWidth={1.5}
                        />
                      )}
                      {i + 1}º
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">
                    {linha.nome}
                    {linha.corretorId === CORRETOR_LOGADO_ID && (
                      <span className="ml-1.5 text-xs font-normal text-text-soft">(você)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{linha.cidade}/{linha.estado}</td>
                  <td className="px-4 py-3 font-mono">{formatPreco(linha.vgv)}</td>
                  <td className="px-4 py-3 font-mono">{linha.vendas}</td>
                  <td className="px-4 py-3 font-mono text-text-mut">
                    {linha.conversao == null ? '—' : `${linha.conversao.toFixed(0)}%`}
                  </td>
                  <td className="px-4 py-3 font-mono text-text-mut">
                    {linha.colaboracao == null ? '—' : `${linha.colaboracao.toFixed(0)}%`}
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-ink">{linha.score.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
