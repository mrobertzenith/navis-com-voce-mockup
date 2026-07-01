import { useMemo } from 'react'
import { Printer } from 'lucide-react'
import { AcoesPendentes, type AcaoPendente } from '@/components/dashboard/AcoesPendentes'
import { AlertasCards } from '@/components/dashboard/AlertasCards'
import { DonutChart, type DonutDatum } from '@/components/dashboard/DonutChart'
import { KpiHero } from '@/components/dashboard/KpiHero'
import { PipelineBar, type PipelineDatum } from '@/components/dashboard/PipelineBar'
import { VendasChart, type VendaMensal } from '@/components/dashboard/VendasChart'
import { Button } from '@/components/ui/button'
import { ETAPA_IMOVEL_LABEL, ETAPA_LEAD_LABEL } from '@/domain/constants'
import { useImoveis } from '@/hooks/useImoveis'
import { useLeads } from '@/hooks/useLeads'
import { CORRETOR_LOGADO_ID } from '@/mocks/data/corretores'
import { ATIVIDADES_SEED } from '@/mocks/data/atividades'
import { formatData, formatDiasDesde, formatPreco } from '@/lib/format'

const NOMES_MES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

function chaveMes(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}`
}

function ultimosNMeses(n: number): { chave: string; label: string }[] {
  const hoje = new Date()
  const meses: { chave: string; label: string }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    meses.push({ chave: `${d.getFullYear()}-${d.getMonth()}`, label: NOMES_MES[d.getMonth()] })
  }
  return meses
}

export function DashboardPage() {
  const { data: imoveis = [] } = useImoveis()
  const { data: leads = [] } = useLeads()

  const meusImoveis = useMemo(
    () => imoveis.filter((i) => i.corretorResponsavelId === CORRETOR_LOGADO_ID),
    [imoveis],
  )
  const meusLeads = useMemo(
    () => leads.filter((l) => l.corretorResponsavelId === CORRETOR_LOGADO_ID),
    [leads],
  )

  const atividades = useMemo(
    () =>
      [...ATIVIDADES_SEED].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
    [],
  )

  const publicados = meusImoveis.filter((i) => i.etapa === 'd')
  const potencialVGV = publicados.reduce((soma, i) => soma + (i.valorAnuncio ?? 0), 0)

  const vendidos = meusImoveis.filter((i) => i.etapa === 'f')
  const vgvVendido = vendidos.reduce((soma, i) => soma + (i.valorVenda ?? 0), 0)
  const ultimaVenda = vendidos
    .filter((i) => i.dataVenda)
    .sort((a, b) => new Date(b.dataVenda!).getTime() - new Date(a.dataVenda!).getTime())[0]

  const meses6 = useMemo(() => ultimosNMeses(6), [])

  const sparklinePublicacoes = useMemo(() => {
    const porMes = new Map<string, number>()
    for (const i of meusImoveis) {
      if (!i.dataPublicacao) continue
      const chave = chaveMes(i.dataPublicacao)
      porMes.set(chave, (porMes.get(chave) ?? 0) + 1)
    }
    return meses6.map((m) => ({ label: m.label, valor: porMes.get(m.chave) ?? 0 }))
  }, [meusImoveis, meses6])

  const vendasPorMes: VendaMensal[] = useMemo(() => {
    const porMes = new Map<string, number>()
    for (const i of vendidos) {
      if (!i.dataVenda) continue
      const chave = chaveMes(i.dataVenda)
      porMes.set(chave, (porMes.get(chave) ?? 0) + (i.valorVenda ?? 0))
    }
    return meses6.map((m) => ({ mes: m.label, vgv: porMes.get(m.chave) ?? 0 }))
  }, [vendidos, meses6])

  const pipelineDados: PipelineDatum[] = useMemo(() => {
    const grupos = [
      { etapa: 'Novo', imovel: ['a'], lead: [1] },
      { etapa: 'Em andamento', imovel: ['b', 'c'], lead: [2, 3] },
      { etapa: 'Negociação', imovel: ['e'], lead: [4] },
      { etapa: 'Concluído', imovel: ['f'], lead: [5, 6] },
    ] as const
    return grupos.map((g) => ({
      etapa: g.etapa,
      imoveis: meusImoveis.filter((i) => (g.imovel as readonly string[]).includes(i.etapa)).length,
      clientes: meusLeads.filter((l) => (g.lead as readonly number[]).includes(l.etapa)).length,
    }))
  }, [meusImoveis, meusLeads])

  const donutImoveis: DonutDatum[] = useMemo(
    () =>
      (['a', 'b', 'c', 'd', 'e', 'f'] as const)
        .map((etapa) => ({ label: ETAPA_IMOVEL_LABEL[etapa], valor: meusImoveis.filter((i) => i.etapa === etapa).length }))
        .filter((d) => d.valor > 0),
    [meusImoveis],
  )

  const donutClientes: DonutDatum[] = useMemo(
    () =>
      ([1, 2, 3, 4, 5, 6, 7, 8] as const)
        .map((etapa) => ({ label: ETAPA_LEAD_LABEL[etapa], valor: meusLeads.filter((l) => l.etapa === etapa).length }))
        .filter((d) => d.valor > 0),
    [meusLeads],
  )

  const parados = meusImoveis.filter(
    (i) => ['a', 'b', 'c'].includes(i.etapa) && formatDiasDesde(i.atualizadoEm) >= 15,
  ).length
  const linksQuebrados = meusImoveis.filter((i) => i.linkQuebrado).length
  const seisMesesAtras = new Date()
  seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6)
  const publicadosMais6m = publicados.filter(
    (i) => i.dataPublicacao && new Date(i.dataPublicacao) < seisMesesAtras,
  ).length

  const acoesPendentes: AcaoPendente[] = useMemo(() => {
    const acoes: AcaoPendente[] = []
    const hoje = Date.now()

    const visitasAtrasadas = meusLeads.filter(
      (l) => l.etapa === 3 && l.dataVisita && new Date(l.dataVisita).getTime() < hoje,
    )
    if (visitasAtrasadas.length > 0) {
      acoes.push({
        id: 'visitas-atrasadas',
        descricao: `${visitasAtrasadas.length} ${visitasAtrasadas.length === 1 ? 'visita agendada está' : 'visitas agendadas estão'} com data já passada`,
        to: '/meus-clientes',
      })
    }

    const semCib = meusImoveis.filter((i) => i.etapa === 'a' && !i.cib)
    if (semCib.length > 0) {
      acoes.push({
        id: 'sem-cib',
        descricao: `${semCib.length} ${semCib.length === 1 ? 'imóvel novo está' : 'imóveis novos estão'} sem CIB preenchido`,
        to: '/meus-imoveis',
      })
    }

    if (linksQuebrados > 0) {
      acoes.push({
        id: 'links-quebrados',
        descricao: `${linksQuebrados} ${linksQuebrados === 1 ? 'anúncio publicado tem' : 'anúncios publicados têm'} link quebrado`,
        to: '/meus-imoveis',
      })
    }

    if (parados > 0) {
      acoes.push({
        id: 'parados',
        descricao: `${parados} ${parados === 1 ? 'imóvel está parado' : 'imóveis estão parados'} há 15 dias ou mais`,
        to: '/meus-imoveis',
      })
    }

    return acoes
  }, [meusLeads, meusImoveis, linksQuebrados, parados])

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-bold">Dashboard</h1>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <KpiHero
            titulo="Potencial em carteira (imóveis publicados)"
            valor={formatPreco(potencialVGV)}
            subtitulo={`${publicados.length} imóveis publicados · imóveis publicados por mês nos últimos 6 meses`}
            serieSparkline={sparklinePublicacoes}
          />
        </div>
        <div className="rounded-card border border-border bg-surface p-4 shadow-card">
          <p className="font-heading text-xs font-semibold uppercase tracking-wide text-text-mut">Vendas</p>
          <p className="mt-1 font-mono text-3xl font-bold text-ink">{vendidos.length}</p>
          <p className="mt-1 text-xs text-text-soft">
            VGV {formatPreco(vgvVendido)} · última venda {ultimaVenda ? formatData(ultimaVenda.dataVenda) : '—'}
          </p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-card border border-border bg-surface p-4 shadow-card">
          <p className="mb-2 font-heading text-xs font-semibold uppercase tracking-wide text-ink">
            Pipeline — imóveis x clientes
          </p>
          <PipelineBar dados={pipelineDados} />
        </div>
        <div>
          <p className="mb-2 font-heading text-xs font-semibold uppercase tracking-wide text-ink">
            Vendas — VGV por mês
          </p>
          <div className="rounded-card border border-border bg-surface p-4 shadow-card">
            <VendasChart dados={vendasPorMes} />
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DonutChart titulo="Imóveis por etapa" dados={donutImoveis} />
        <DonutChart titulo="Clientes por etapa" dados={donutClientes} />
      </div>

      <div className="mb-4">
        <AlertasCards parados={parados} linksQuebrados={linksQuebrados} publicadosMais6m={publicadosMais6m} />
      </div>

      <div className="mb-4">
        <AcoesPendentes acoes={acoesPendentes} />
      </div>

      <div className="rounded-card border border-border bg-surface p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-ink">
            Suas atividades
          </h2>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" strokeWidth={1.5} />
            Imprimir
          </Button>
        </div>
        <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {atividades.map((a) => (
            <li key={a.id} className="flex items-baseline justify-between gap-4 border-b border-border pb-2 last:border-none">
              <span className="text-sm text-text">{a.descricao}</span>
              <span className="shrink-0 font-mono text-xs text-text-soft">{formatData(a.timestamp)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
