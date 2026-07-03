import { useMemo, useState } from 'react'
import { Trophy } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import { useImoveis } from '@/hooks/useImoveis'
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
}

export function RankingCorretoresPage() {
  const { data: imoveis = [], isLoading } = useImoveis()
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

    return CORRETORES.filter((c) => (!estado || c.estado === estado) && (!cidade || c.cidade === cidade))
      .map((c) => ({
        corretorId: c.id,
        nome: c.nome,
        cidade: c.cidade,
        estado: c.estado,
        vendas: porCorretor.get(c.id)?.vendas ?? 0,
        vgv: porCorretor.get(c.id)?.vgv ?? 0,
      }))
      .sort((a, b) => b.vendas - a.vendas || b.vgv - a.vgv)
  }, [imoveis, estado, cidade])

  if (isLoading) {
    return <div className="p-6 text-sm text-text-mut">Carregando ranking…</div>
  }

  return (
    <div className="p-6">
      <h1 className="mb-1 text-xl font-bold">Ranking de Corretores</h1>
      <p className="mb-4 text-sm text-text-mut">
        Classificação por número de vendas concluídas. Ajuste os filtros para ver o ranking por
        cidade ou estado.
      </p>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label>Estado</Label>
          <Select
            value={estado}
            onValueChange={(v) => {
              setEstado(v)
              setCidade('')
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos (ranking geral)" />
            </SelectTrigger>
            <SelectContent>
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
          <Select value={cidade} onValueChange={setCidade}>
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
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
                <th className="px-4 py-3">Vendas</th>
                <th className="px-4 py-3">VGV vendido</th>
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
                      {i < 3 && linha.vendas > 0 && (
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
                  <td className="px-4 py-3 font-mono">{linha.vendas}</td>
                  <td className="px-4 py-3 font-mono">{formatPreco(linha.vgv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
