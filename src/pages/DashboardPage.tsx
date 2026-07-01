import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Building2,
  Wallet,
  Handshake,
  TrendingUp,
  FileBarChart,
  Printer,
} from 'lucide-react'
import { QuadranteCard } from '@/components/dashboard/QuadranteCard'
import { Button } from '@/components/ui/button'
import { useImoveis } from '@/hooks/useImoveis'
import { useLeads } from '@/hooks/useLeads'
import { CORRETOR_LOGADO_ID } from '@/mocks/data/corretores'
import { ATIVIDADES_SEED } from '@/mocks/data/atividades'
import { formatData, formatPreco } from '@/lib/format'

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

  const emAtendimento = meusLeads.filter((l) => l.etapa === 2).length
  const visitasAgendadas = meusLeads.filter((l) => l.etapa === 3).length
  const emNegociacaoLeads = meusLeads.filter((l) => l.etapa === 4).length

  const emProspeccao = meusImoveis.filter((i) => i.etapa === 'a').length
  const emAnalise = meusImoveis.filter((i) => i.etapa === 'b').length
  const cadastrados = meusImoveis.filter((i) => i.etapa === 'd').length

  const potencialVGV = meusImoveis
    .filter((i) => i.etapa === 'd')
    .reduce((soma, i) => soma + (i.valorAnuncio ?? 0), 0)

  const imoveisEmNegociacao = meusImoveis.filter((i) => i.etapa === 'e').length

  const vendidos = meusImoveis.filter((i) => i.etapa === 'f')
  const vgvVendido = vendidos.reduce((soma, i) => soma + (i.valorVenda ?? 0), 0)
  const ultimaVenda = vendidos
    .filter((i) => i.dataVenda)
    .sort((a, b) => new Date(b.dataVenda!).getTime() - new Date(a.dataVenda!).getTime())[0]

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <QuadranteCard
          titulo="Clientes"
          icon={Users}
          itens={[
            { label: 'Em atendimento', valor: emAtendimento },
            { label: 'Visitas agendadas', valor: visitasAgendadas },
            { label: 'Em negociação', valor: emNegociacaoLeads },
          ]}
        />
        <QuadranteCard
          titulo="Imóveis"
          icon={Building2}
          itens={[
            { label: 'Em prospecção (a)', valor: emProspeccao },
            { label: 'Análise (b)', valor: emAnalise },
            { label: 'Cadastrados (d)', valor: cadastrados },
          ]}
        />
        <QuadranteCard
          titulo="Potencial (R$)"
          icon={Wallet}
          itens={[{ label: 'Soma de valores publicados', valor: formatPreco(potencialVGV) }]}
        />
        <QuadranteCard
          titulo="Negociações ativas agora"
          icon={Handshake}
          itens={[
            { label: 'Imóveis em negociação', valor: imoveisEmNegociacao },
            { label: 'Clientes em negociação', valor: emNegociacaoLeads },
          ]}
        />
        <QuadranteCard
          titulo="Vendas"
          icon={TrendingUp}
          itens={[
            { label: 'Total vendidos', valor: vendidos.length },
            { label: 'VGV', valor: formatPreco(vgvVendido) },
            { label: 'Última venda', valor: ultimaVenda ? formatData(ultimaVenda.dataVenda) : '—' },
          ]}
        />
        <QuadranteCard
          titulo="Relatórios"
          icon={FileBarChart}
          itens={[]}
          rodape={
            <div className="flex flex-col gap-2">
              <Button variant="outline" size="sm" className="justify-start" disabled>
                Radar de oportunidades (em breve)
              </Button>
              <Button variant="outline" size="sm" className="justify-start" disabled>
                Imóveis parados (em breve)
              </Button>
              <Button variant="outline" size="sm" className="justify-start" asChild>
                <Link to="/imoveis-perdidos">Imóveis Perdidos</Link>
              </Button>
            </div>
          }
        />
      </div>

      <div className="mt-6 rounded-card border border-border bg-surface p-4 shadow-card">
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
