import { useMemo, useState } from 'react'
import { CardImovel } from '@/components/imovel/CardImovel'
import { BarraCompartilhar } from '@/components/shared/BarraCompartilhar'
import { reunirLinks } from '@/lib/compartilhar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import { TIPO_IMOVEL_LABEL } from '@/domain/constants'
import type { Imovel, TipoImovel } from '@/domain/types'
import { useImoveis } from '@/hooks/useImoveis'
import { nomeCorretor } from '@/mocks/data/corretores'
import { formatData, formatPreco } from '@/lib/format'
import { useUIStore } from '@/stores/uiStore'

const TIPOS: TipoImovel[] = [
  'apartamento',
  'casa_rua',
  'casa_condominio',
  'casa_comercial',
  'terreno_rua',
  'terreno_condominio',
  'terreno_comercial',
  'sala_comercial',
  'galpao_comercial_industrial',
]

type Visao = 'publicados' | 'vendidos' | 'parados'
type Ordenacao = 'preco_asc' | 'preco_desc' | 'cadastro_asc' | 'cadastro_desc'

function diasEntre(a: string, b: string): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24))
}

export function TodosImoveisPage() {
  const { data: imoveis = [], isLoading } = useImoveis()
  const abrirModalImovel = useUIStore((s) => s.abrirModalImovel)

  const [visao, setVisao] = useState<Visao>('publicados')
  const [tipo, setTipo] = useState<string>('')
  const [cidade, setCidade] = useState<string>('')
  const [precoMin, setPrecoMin] = useState('')
  const [precoMax, setPrecoMax] = useState('')
  const [quartosMin, setQuartosMin] = useState('')
  const [vagasMin, setVagasMin] = useState('')
  const [areaMin, setAreaMin] = useState('')
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('cadastro_desc')
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  function alternar(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  const baseVisao = useMemo(() => {
    const agora = new Date().toISOString()
    if (visao === 'vendidos') return imoveis.filter((i) => i.etapa === 'f')
    if (visao === 'parados')
      return imoveis.filter(
        (i) => i.etapa === 'd' && i.dataPublicacao && diasEntre(i.dataPublicacao, agora) > 365,
      )
    // imóveis em negociação (etapa 'e') continuam aparecendo aqui — o corretor precisa
    // conseguir monitorá-los; o sinal visual abaixo é que os distingue dos publicados
    return imoveis.filter((i) => i.etapa === 'd' || i.etapa === 'e')
  }, [imoveis, visao])

  const cidades = useMemo(
    () => Array.from(new Set(baseVisao.map((i) => i.cidade))).sort(),
    [baseVisao],
  )

  const filtrados = useMemo(() => {
    let lista = baseVisao
    if (tipo) lista = lista.filter((i) => i.tipo === tipo)
    if (cidade) lista = lista.filter((i) => i.cidade === cidade)
    if (precoMin) lista = lista.filter((i) => (i.valorAnuncio ?? 0) >= Number(precoMin))
    if (precoMax) lista = lista.filter((i) => (i.valorAnuncio ?? 0) <= Number(precoMax))
    if (quartosMin) lista = lista.filter((i) => i.quartos >= Number(quartosMin))
    if (vagasMin) lista = lista.filter((i) => i.vagas >= Number(vagasMin))
    if (areaMin) {
      lista = lista.filter(
        (i) => (i.areaPrivativaM2 ?? i.areaConstruidaM2 ?? i.areaTerrenoM2 ?? 0) >= Number(areaMin),
      )
    }

    const comparadores: Record<Ordenacao, (a: Imovel, b: Imovel) => number> = {
      preco_asc: (a, b) => (a.valorAnuncio ?? 0) - (b.valorAnuncio ?? 0),
      preco_desc: (a, b) => (b.valorAnuncio ?? 0) - (a.valorAnuncio ?? 0),
      cadastro_asc: (a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime(),
      cadastro_desc: (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime(),
    }
    return [...lista].sort(comparadores[ordenacao])
  }, [baseVisao, tipo, cidade, precoMin, precoMax, quartosMin, vagasMin, areaMin, ordenacao])

  // só o que ainda está visível entra (filtros mudam a lista sem limpar a seleção)
  const marcados = filtrados.filter((i) => selecionados.has(i.id))

  if (isLoading) {
    return <div className="p-6 text-sm text-text-mut">Carregando imóveis…</div>
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold">Todos os Imóveis</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={visao === 'publicados' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setVisao('publicados')}
          >
            Publicados
          </Button>
          <Button
            variant={visao === 'vendidos' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setVisao('vendidos')}
          >
            Imóveis Vendidos
          </Button>
          <Button
            variant={visao === 'parados' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setVisao('parados')}
          >
            Não vendidos em 12 meses
          </Button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <div className="flex flex-col gap-1.5">
          <Label>Tipo</Label>
          <Select value={tipo || 'todos'} onValueChange={(v) => setTipo(v === 'todos' ? '' : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {TIPOS.map((t) => (
                <SelectItem key={t} value={t}>
                  {TIPO_IMOVEL_LABEL[t]}
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
        <div className="flex flex-col gap-1.5">
          <Label>Preço mín.</Label>
          <Input type="number" value={precoMin} onChange={(e) => setPrecoMin(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Preço máx.</Label>
          <Input type="number" value={precoMax} onChange={(e) => setPrecoMax(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Quartos (mín.)</Label>
          <Input type="number" min={0} value={quartosMin} onChange={(e) => setQuartosMin(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Vagas (mín.)</Label>
          <Input type="number" min={0} value={vagasMin} onChange={(e) => setVagasMin(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Área mín. (m²)</Label>
          <Input type="number" min={0} value={areaMin} onChange={(e) => setAreaMin(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Ordenar por</Label>
          <Select value={ordenacao} onValueChange={(v) => setOrdenacao(v as Ordenacao)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cadastro_desc">Cadastro (mais recente)</SelectItem>
              <SelectItem value="cadastro_asc">Cadastro (mais antigo)</SelectItem>
              <SelectItem value="preco_asc">Preço (menor primeiro)</SelectItem>
              <SelectItem value="preco_desc">Preço (maior primeiro)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState title="Nenhum imóvel encontrado" description="Ajuste os filtros para ver mais resultados." />
      ) : (
        <>
          {/* Desktop: tabela */}
          <div className="hidden overflow-x-auto rounded-card border border-border sm:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg text-xs uppercase tracking-wide text-text-mut">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Selecionar todos os imóveis da lista"
                      checked={filtrados.length > 0 && marcados.length === filtrados.length}
                      onChange={(e) =>
                        setSelecionados(e.target.checked ? new Set(filtrados.map((i) => i.id)) : new Set())
                      }
                      className="h-4 w-4 rounded border-border"
                    />
                  </th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Bairro</th>
                  <th className="px-4 py-3">Cidade</th>
                  <th className="px-4 py-3">{visao === 'vendidos' ? 'Preço anunciado' : 'Preço'}</th>
                  {visao === 'vendidos' && (
                    <>
                      <th className="px-4 py-3">Preço vendido</th>
                      <th className="px-4 py-3">Data venda</th>
                      <th className="px-4 py-3">Tempo de anúncio</th>
                    </>
                  )}
                  <th className="px-4 py-3">Corretor</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((imovel) => {
                  return (
                    <tr
                      key={imovel.id}
                      onClick={() => abrirModalImovel(imovel.id)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          abrirModalImovel(imovel.id)
                        }
                      }}
                      className="cursor-pointer border-t border-border hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label="Selecionar para compartilhar"
                          checked={selecionados.has(imovel.id)}
                          onChange={() => alternar(imovel.id)}
                          className="h-4 w-4 rounded border-border"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          {imovel.etapa === 'e' && (
                            <span
                              className="h-2 w-2 shrink-0 rounded-full bg-danger"
                              title="Em negociação"
                              aria-label="Em negociação"
                            />
                          )}
                          {TIPO_IMOVEL_LABEL[imovel.tipo]}
                        </span>
                      </td>
                      <td className="px-4 py-3">{imovel.bairro}</td>
                      <td className="px-4 py-3">{imovel.cidade}</td>
                      <td className="px-4 py-3 font-mono">{formatPreco(imovel.valorAnuncio)}</td>
                      {visao === 'vendidos' && (
                        <>
                          <td className="px-4 py-3 font-mono">{formatPreco(imovel.valorVenda)}</td>
                          <td className="px-4 py-3 font-mono">{formatData(imovel.dataVenda)}</td>
                          <td className="px-4 py-3 font-mono">
                            {imovel.dataPublicacao && imovel.dataVenda
                              ? `${diasEntre(imovel.dataPublicacao, imovel.dataVenda)}d`
                              : '—'}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3">
                        {nomeCorretor(imovel.corretorResponsavelId)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {filtrados.map((imovel) => (
              <div key={imovel.id} className="relative">
                <CardImovel imovel={imovel} onClick={() => abrirModalImovel(imovel.id)} />
                <input
                  type="checkbox"
                  aria-label="Selecionar para compartilhar"
                  checked={selecionados.has(imovel.id)}
                  onChange={() => alternar(imovel.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-2 top-2 z-10 h-5 w-5 rounded border-border"
                />
              </div>
            ))}
          </div>

          <BarraCompartilhar
            selecionados={marcados.length}
            resultado={reunirLinks(marcados)}
            onLimpar={() => setSelecionados(new Set())}
          />
        </>
      )}
    </div>
  )
}
