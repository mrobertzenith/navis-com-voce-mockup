import { useMemo, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { CardCliente, type LeadCardData } from '@/components/lead/CardCliente'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/shared/EmptyState'
import { ETAPA_LEAD_LABEL, TIPO_IMOVEL_LABEL } from '@/domain/constants'
import type { TipoImovel } from '@/domain/types'
import { useLeads } from '@/hooks/useLeads'
import { CORRETORES, nomeCorretor } from '@/mocks/data/corretores'
import { formatData, formatPreco } from '@/lib/format'

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

export function TodosClientesPage() {
  const { data: leads = [], isLoading } = useLeads()
  const [tipo, setTipo] = useState<string>('')
  const [cidade, setCidade] = useState<string>('')

  const elegiveis: LeadCardData[] = useMemo(() => {
    return leads.filter((l) => l.etapa !== 8).map(({ nome: _nome, ...resto }) => resto)
  }, [leads])

  const cidades = useMemo(
    () => Array.from(new Set(elegiveis.map((l) => l.perfilBusca.cidade))).sort(),
    [elegiveis],
  )

  const filtrados = useMemo(() => {
    let lista = elegiveis
    if (tipo) lista = lista.filter((l) => l.perfilBusca.tipos.includes(tipo as TipoImovel))
    if (cidade) lista = lista.filter((l) => l.perfilBusca.cidade === cidade)
    return lista
  }, [elegiveis, tipo, cidade])

  if (isLoading) {
    return <div className="p-6 text-sm text-text-mut">Carregando clientes…</div>
  }

  return (
    <div className="p-6">
      <h1 className="mb-1 text-xl font-bold">Todos os Clientes</h1>
      <p className="mb-4 text-sm text-text-mut">
        Lista anonimizada — nomes e contatos dos clientes nunca são exibidos aqui.
      </p>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label>Tipo desejado</Label>
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
      </div>

      {filtrados.length === 0 ? (
        <EmptyState title="Nenhum cliente encontrado" description="Ajuste os filtros para ver mais resultados." />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-card border border-border sm:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg text-xs uppercase tracking-wide text-text-mut">
                <tr>
                  <th className="px-4 py-3">Perfil de interesse</th>
                  <th className="px-4 py-3">Local</th>
                  <th className="px-4 py-3">Valor desejado</th>
                  <th className="px-4 py-3">Cadastro</th>
                  <th className="px-4 py-3">Etapa</th>
                  <th className="px-4 py-3">Corretor</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((lead) => {
                  const corretor = CORRETORES.find((c) => c.id === lead.corretorResponsavelId)
                  return (
                    <tr key={lead.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        {lead.perfilBusca.tipos.map((t) => TIPO_IMOVEL_LABEL[t]).join(', ')}
                      </td>
                      <td className="px-4 py-3">
                        {lead.perfilBusca.bairros.join(', ') || lead.perfilBusca.cidade}, {lead.perfilBusca.cidade}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {lead.perfilBusca.valorDe != null && lead.perfilBusca.valorAte != null
                          ? `${formatPreco(lead.perfilBusca.valorDe)} – ${formatPreco(lead.perfilBusca.valorAte)}`
                          : formatPreco(lead.perfilBusca.valorAte ?? lead.perfilBusca.valorDe)}
                      </td>
                      <td className="px-4 py-3 font-mono">{formatData(lead.dataCadastro)}</td>
                      <td className="px-4 py-3">{ETAPA_LEAD_LABEL[lead.etapa]}</td>
                      <td className="px-4 py-3">
                        {corretor && (
                          <a
                            href={`https://wa.me/55${corretor.telefoneWhatsapp}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                            {nomeCorretor(lead.corretorResponsavelId)}
                          </a>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 sm:hidden">
            {filtrados.map((lead) => (
              <CardCliente key={lead.id} lead={lead} visao="publica" />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
