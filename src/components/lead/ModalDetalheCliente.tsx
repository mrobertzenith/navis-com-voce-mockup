import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ChipTipoImovel } from '@/components/imovel/ChipTipoImovel'
import { ETAPA_LEAD_LABEL } from '@/domain/constants'
import type { Lead } from '@/domain/types'
import { formatData, formatPreco, formatTelefone } from '@/lib/format'
import { CORRETOR_LOGADO_ID } from '@/mocks/data/corretores'

interface ModalDetalheClienteProps {
  lead: Lead | null
  onClose: () => void
}

const ORIGEM_LABEL: Record<string, string> = {
  rede_social: 'Rede social',
  relacionamento: 'Relacionamento',
  indicacao: 'Indicação',
  campanha_online: 'Campanha online',
  campanha_offline: 'Campanha offline',
  site: 'Site',
}

export function ModalDetalheCliente({ lead, onClose }: ModalDetalheClienteProps) {
  if (!lead) return null

  const ehProprio = lead.corretorResponsavelId === CORRETOR_LOGADO_ID
  const { perfilBusca } = lead
  const faixaValor =
    perfilBusca.valorDe != null && perfilBusca.valorAte != null
      ? `${formatPreco(perfilBusca.valorDe)} – ${formatPreco(perfilBusca.valorAte)}`
      : perfilBusca.valorAte != null
        ? `até ${formatPreco(perfilBusca.valorAte)}`
        : `a partir de ${formatPreco(perfilBusca.valorDe)}`

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{ehProprio ? lead.nome : lead.codigo}</DialogTitle>
          <DialogDescription>
            {lead.codigo} · {ETAPA_LEAD_LABEL[lead.etapa]}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {ehProprio && (
            <div className="grid grid-cols-2 gap-2 text-sm text-text-mut">
              {lead.telefoneWhatsapp && <p>Telefone: {formatTelefone(lead.telefoneWhatsapp)}</p>}
              {lead.email && <p>E-mail: {lead.email}</p>}
              {lead.origem && <p>Origem: {ORIGEM_LABEL[lead.origem] ?? lead.origem}</p>}
              <p>Cadastrado em {formatData(lead.dataCadastro)}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-1">
            {perfilBusca.tipos.map((tipo) => (
              <ChipTipoImovel key={tipo} tipo={tipo} />
            ))}
          </div>

          <p className="text-sm text-text-mut">
            {perfilBusca.bairros.join(', ') || perfilBusca.cidade} · {perfilBusca.cidade}/
            {perfilBusca.estado}
          </p>
          <p className="font-mono text-base font-semibold text-ink">{faixaValor}</p>

          {(perfilBusca.quartosMin || perfilBusca.suitesMin || perfilBusca.vagasMin) && (
            <p className="text-sm text-text-mut">
              Mínimos: {perfilBusca.quartosMin ? `${perfilBusca.quartosMin} quartos` : null}
              {perfilBusca.suitesMin ? ` · ${perfilBusca.suitesMin} suítes` : null}
              {perfilBusca.vagasMin ? ` · ${perfilBusca.vagasMin} vagas` : null}
            </p>
          )}

          {ehProprio && lead.observacoes && (
            <p className="border-t border-border pt-3 text-sm text-text-mut">{lead.observacoes}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
