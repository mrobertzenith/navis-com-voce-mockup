import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  limitesDoPeriodo,
  PESO_COLABORACAO,
  PESO_CONVERSAO,
  PESO_VGV,
  type PeriodoRanking,
  type TipoPeriodo,
} from '@/domain/ranking'
import { useRankingCorretores } from '@/hooks/useRankingCorretores'
import { CORRETORES, CORRETOR_LOGADO_ID } from '@/mocks/data/corretores'
import { useAuthStore } from '@/stores/authStore'
import { formatPreco } from '@/lib/format'
import { cn } from '@/lib/cn'

type ModoRanking = 'vgv' | 'composto'

const TIPOS: Array<{ tipo: TipoPeriodo; rotulo: string }> = [
  { tipo: 'mes', rotulo: 'Mês' },
  { tipo: 'trimestre', rotulo: 'Trimestre' },
  { tipo: 'semestre', rotulo: 'Semestre' },
  { tipo: 'ano', rotulo: 'Ano' },
  { tipo: 'tudo', rotulo: 'Todo o período' },
]

const NOMES_MES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

/** Agora em horário de Brasília (UTC−3), pra o "período atual" bater com o que o corretor vê no calendário. */
function agoraBrasilia(): { ano: number; mes: number } {
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000)
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() }
}

function periodoAtual(tipo: TipoPeriodo): PeriodoRanking {
  const { ano, mes } = agoraBrasilia()
  if (tipo === 'mes') return { tipo, ano, indice: mes }
  if (tipo === 'trimestre') return { tipo, ano, indice: Math.floor(mes / 3) }
  if (tipo === 'semestre') return { tipo, ano, indice: Math.floor(mes / 6) }
  return { tipo, ano, indice: 0 }
}

/** Anda um período pra trás (-1) ou pra frente (+1), virando o ano quando preciso. */
function mover(p: PeriodoRanking, passo: -1 | 1): PeriodoRanking {
  if (p.tipo === 'ano') return { ...p, ano: p.ano + passo }
  const porAno = { mes: 12, trimestre: 4, semestre: 2 }[p.tipo as 'mes' | 'trimestre' | 'semestre']
  let indice = p.indice + passo
  let ano = p.ano
  if (indice < 0) {
    indice = porAno - 1
    ano -= 1
  } else if (indice >= porAno) {
    indice = 0
    ano += 1
  }
  return { ...p, ano, indice }
}

function rotuloDoPeriodo(p: PeriodoRanking): string {
  if (p.tipo === 'tudo') return 'Desde o início'
  if (p.tipo === 'ano') return String(p.ano)
  if (p.tipo === 'mes') return `${NOMES_MES[p.indice]} de ${p.ano}`
  if (p.tipo === 'trimestre') return `${p.indice + 1}º trimestre de ${p.ano}`
  return `${p.indice + 1}º semestre de ${p.ano}`
}

/**
 * Ranking de VGV executado por período, aberto a toda a equipe. Visão de admin
 * ganha o "Score composto" (VGV + conversão + colaboração) e as colunas de
 * apoio — o servidor só devolve esses campos pra admin (Edge Function
 * "ranking-corretores"). Aqui sobra filtro de estado/cidade, controle de
 * período, ordenação por modo e a tabela; nenhuma regra de negócio.
 */
export function RankingCorretoresPage() {
  const admin = useAuthStore((s) => s.corretor?.papel === 'admin')
  const [periodo, setPeriodo] = useState<PeriodoRanking>(() => periodoAtual('mes'))
  const { ranking: rankingCompleto, isLoading, isError } = useRankingCorretores(periodo)
  const [modo, setModo] = useState<ModoRanking>('vgv')
  const [estado, setEstado] = useState<string>('')
  const [cidade, setCidade] = useState<string>('')

  const modoEfetivo: ModoRanking = admin ? modo : 'vgv'

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

  // só quem vendeu no período: lista cheia de R$ 0 não ajuda ninguém a se comparar
  const ranking = useMemo(
    () =>
      rankingCompleto
        .filter((l) => l.vendas > 0 && (!estado || l.estado === estado) && (!cidade || l.cidade === cidade))
        .sort((a, b) =>
          modoEfetivo === 'vgv' ? b.vgv - a.vgv || b.vendas - a.vendas : b.score - a.score || b.vgv - a.vgv,
        ),
    [rankingCompleto, estado, cidade, modoEfetivo],
  )

  const totalVgv = ranking.reduce((soma, l) => soma + l.vgv, 0)
  const totalVendas = ranking.reduce((soma, l) => soma + l.vendas, 0)

  // não deixa navegar pra um período que ainda nem começou
  const proximo = periodo.tipo === 'tudo' ? null : limitesDoPeriodo(mover(periodo, 1))
  const proximoNoFuturo = proximo != null && proximo.inicio > new Date().toISOString()

  return (
    <div className="p-6">
      <h1 className="mb-1 text-xl font-bold">Ranking de VGV</h1>
      <p className="mb-4 text-sm text-text-mut">
        {modoEfetivo === 'vgv'
          ? 'VGV executado: soma das vendas confirmadas (já descontadas as revertidas) de cada corretor, pelo imóvel que ele tem na carteira, na data da confirmação da venda.'
          : `Score composto — ${PESO_VGV * 100}% VGV executado, ${PESO_CONVERSAO * 100}% taxa de conversão (negociações concluídas vs. revertidas) e ${PESO_COLABORACAO * 100}% colaboração (vendas fechadas com cliente de outro corretor). Ticket alto sozinho não garante o topo.`}
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Tipo de período" className="inline-flex flex-wrap rounded-card border border-border p-1">
          {TIPOS.map(({ tipo, rotulo }) => (
            <Button
              key={tipo}
              variant={periodo.tipo === tipo ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriodo(periodoAtual(tipo))}
            >
              {rotulo}
            </Button>
          ))}
        </div>

        {periodo.tipo !== 'tudo' && (
          <div className="inline-flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="Período anterior"
              onClick={() => setPeriodo(mover(periodo, -1))}
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            </Button>
            <span className="min-w-44 text-center text-sm font-medium text-ink" aria-live="polite">
              {rotuloDoPeriodo(periodo)}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="Próximo período"
              disabled={proximoNoFuturo}
              onClick={() => setPeriodo(mover(periodo, 1))}
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </div>
        )}

        {admin && (
          <div className="inline-flex rounded-card border border-border p-1 sm:ml-auto">
            <Button variant={modo === 'vgv' ? 'default' : 'ghost'} size="sm" onClick={() => setModo('vgv')}>
              Só VGV
            </Button>
            <Button variant={modo === 'composto' ? 'default' : 'ghost'} size="sm" onClick={() => setModo('composto')}>
              Score composto
            </Button>
          </div>
        )}
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

      {isLoading ? (
        <div className="text-sm text-text-mut">Carregando ranking…</div>
      ) : isError ? (
        <EmptyState title="Não consegui carregar o ranking" description="Tente de novo em instantes." />
      ) : ranking.length === 0 ? (
        <EmptyState
          title="Nenhuma venda neste período"
          description="Assim que houver vendas confirmadas no período escolhido, os corretores aparecem aqui."
        />
      ) : (
        <>
          <p className="mb-2 text-sm text-text-mut">
            <span className="font-medium text-ink">{formatPreco(totalVgv)}</span> em {totalVendas}{' '}
            {totalVendas === 1 ? 'venda' : 'vendas'} · {rotuloDoPeriodo(periodo)}
          </p>
          <div className="overflow-x-auto rounded-card border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg text-xs uppercase tracking-wide text-text-mut">
                <tr>
                  <th className="px-4 py-3">Posição</th>
                  <th className="px-4 py-3">Corretor</th>
                  <th className="px-4 py-3">Cidade</th>
                  <th className={cn('px-4 py-3', modoEfetivo === 'vgv' && 'text-ink')}>VGV executado</th>
                  <th className="px-4 py-3">Vendas</th>
                  {admin && (
                    <>
                      <th className="px-4 py-3">Conversão</th>
                      <th className="px-4 py-3">Colaboração</th>
                      <th className={cn('px-4 py-3', modoEfetivo === 'composto' && 'text-ink')}>Score</th>
                    </>
                  )}
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
                        {i < 3 && (
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
                    <td
                      className={cn(
                        'px-4 py-3 font-mono',
                        modoEfetivo === 'vgv' ? 'font-semibold text-ink' : 'text-text-mut',
                      )}
                    >
                      {formatPreco(linha.vgv)}
                    </td>
                    <td className="px-4 py-3 font-mono">{linha.vendas}</td>
                    {admin && (
                      <>
                        <td className="px-4 py-3 font-mono text-text-mut">
                          {linha.conversao == null ? '—' : `${linha.conversao.toFixed(0)}%`}
                        </td>
                        <td className="px-4 py-3 font-mono text-text-mut">
                          {linha.colaboracao == null ? '—' : `${linha.colaboracao.toFixed(0)}%`}
                        </td>
                        <td
                          className={cn(
                            'px-4 py-3 font-mono',
                            modoEfetivo === 'composto' ? 'font-semibold text-ink' : 'text-text-mut',
                          )}
                        >
                          {linha.score.toFixed(0)}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
