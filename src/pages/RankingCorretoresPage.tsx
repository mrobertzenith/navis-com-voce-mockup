import { useMemo, useState } from 'react'
import { Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import { PESO_COLABORACAO, PESO_CONVERSAO, PESO_VGV } from '@/domain/ranking'
import { useRankingCorretores } from '@/hooks/useRankingCorretores'
import { CORRETORES, CORRETOR_LOGADO_ID } from '@/mocks/data/corretores'
import { formatPreco } from '@/lib/format'
import { cn } from '@/lib/cn'

type ModoRanking = 'vgv' | 'composto'

/**
 * Ranking só por VGV bruto premia ticket alto, não qualidade nem trabalho em
 * equipe (achado de auditoria, 14/09/2026) — mas o PO quer manter essa visão
 * como opção (decisão de produto, 15/09/2026), não substituí-la. As duas
 * colunas de apoio (conversão, colaboração) usam só dado que já existe (sem
 * migração nova): taxa de conversão (negociações concluídas / concluídas+
 * revertidas — "ativa" ainda está em aberto) e colaboração (das vendas
 * concluídas, quantas fecharam com cliente de OUTRO corretor). O modo
 * "Score composto" pondera as três; o modo "Só VGV" ordena só pelo valor
 * vendido, como sempre foi — as colunas extras ficam visíveis pra contexto,
 * mas não entram no critério de ordenação nesse modo.
 *
 * O cálculo em si (domain/ranking.ts) roda na Edge Function
 * "ranking-corretores" quando há Supabase (achado de revisão, 15/09/2026:
 * regra gerencial não devia ficar duplicada no cliente) — aqui só sobra
 * filtro de estado/cidade, ordenação por modo e a tabela.
 */
export function RankingCorretoresPage() {
  const { ranking: rankingCompleto, isLoading } = useRankingCorretores()
  const [modo, setModo] = useState<ModoRanking>('vgv')
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

  const ranking = useMemo(
    () =>
      rankingCompleto
        .filter((l) => (!estado || l.estado === estado) && (!cidade || l.cidade === cidade))
        .sort((a, b) =>
          modo === 'vgv' ? b.vgv - a.vgv || b.vendas - a.vendas : b.score - a.score || b.vgv - a.vgv,
        ),
    [rankingCompleto, estado, cidade, modo],
  )

  if (isLoading) {
    return <div className="p-6 text-sm text-text-mut">Carregando ranking…</div>
  }

  return (
    <div className="p-6">
      <h1 className="mb-1 text-xl font-bold">Ranking de Corretores</h1>
      <p className="mb-4 text-sm text-text-mut">
        {modo === 'vgv'
          ? 'Ordenado por VGV vendido (valor geral de vendas) — a métrica que equilibra corretores de ticket alto e popular.'
          : `Score composto — ${PESO_VGV * 100}% VGV vendido, ${PESO_CONVERSAO * 100}% taxa de conversão (negociações concluídas vs. revertidas) e ${PESO_COLABORACAO * 100}% colaboração (vendas fechadas com cliente de outro corretor). Ticket alto sozinho não garante o topo.`}{' '}
        Ajuste os filtros para ver o ranking por cidade ou estado.
      </p>

      <div className="mb-4 inline-flex rounded-card border border-border p-1">
        <Button
          variant={modo === 'vgv' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setModo('vgv')}
        >
          Só VGV
        </Button>
        <Button
          variant={modo === 'composto' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setModo('composto')}
        >
          Score composto
        </Button>
      </div>

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
                <th className={cn('px-4 py-3', modo === 'vgv' && 'text-ink')}>VGV vendido</th>
                <th className="px-4 py-3">Vendas</th>
                <th className="px-4 py-3">Conversão</th>
                <th className="px-4 py-3">Colaboração</th>
                <th className={cn('px-4 py-3', modo === 'composto' && 'text-ink')}>Score</th>
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
                      {i < 3 && (modo === 'vgv' ? linha.vgv > 0 : linha.score > 0) && (
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
                  <td className={cn('px-4 py-3 font-mono', modo === 'vgv' ? 'font-semibold text-ink' : 'text-text-mut')}>
                    {formatPreco(linha.vgv)}
                  </td>
                  <td className="px-4 py-3 font-mono">{linha.vendas}</td>
                  <td className="px-4 py-3 font-mono text-text-mut">
                    {linha.conversao == null ? '—' : `${linha.conversao.toFixed(0)}%`}
                  </td>
                  <td className="px-4 py-3 font-mono text-text-mut">
                    {linha.colaboracao == null ? '—' : `${linha.colaboracao.toFixed(0)}%`}
                  </td>
                  <td className={cn('px-4 py-3 font-mono', modo === 'composto' ? 'font-semibold text-ink' : 'text-text-mut')}>
                    {linha.score.toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
