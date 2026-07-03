import { useMemo, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { CardImovel } from '@/components/imovel/CardImovel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import { TIPO_IMOVEL_LABEL } from '@/domain/constants'
import type { Imovel, TipoImovel } from '@/domain/types'
import { useImoveis } from '@/hooks/useImoveis'
import { CORRETORES, nomeCorretor } from '@/mocks/data/corretores'
import { formatData, formatPreco } from '@/lib/format'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/cn'

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

  const baseVisao = useMemo(() => {
    const agora = new Date().toISOString()
    if (visao === 'vendidos') return imoveis.filter((i) => i.etapa === 'f')
    if (visao === 'parados')
      return imoveis.filter(
        (i) => i.etapa === 'd' && i.dataPublicacao && diasEntre(i.dataPublicacao, agora) > 365,
      )
    return imoveis.filter((i) => i.etapa === 'd')
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
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
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
                  const corretor = CORRETORES.find((c) => c.id === imovel.corretorResponsavelId)
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
                      <td className="px-4 py-3">{TIPO_IMOVEL_LABEL[imovel.tipo]}</td>
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
                        {corretor ? (
                          <a
                            href={`https://wa.me/55${corretor.telefoneWhatsapp}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className={cn('inline-flex items-center gap-1 text-primary hover:underline')}
                          >
                            <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                            {nomeCorretor(imovel.corretorResponsavelId)}
                          </a>
                        ) : (
                          nomeCorretor(imovel.corretorResponsavelId)
                        )}
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
              <CardImovel key={imovel.id} imovel={imovel} onClick={() => abrirModalImovel(imovel.id)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
