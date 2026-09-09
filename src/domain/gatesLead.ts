import { ETAPA_LEAD_ORDEM } from '@/domain/constants'
import type { EtapaLead, Lead } from '@/domain/types'

export type CampoGateLead =
  | 'observacoes'
  | 'visitasAgendadas'
  | 'imovelNegociacaoId'
  | 'motivoStandby'
  | 'motivoPerdido'
  | 'pagamentosConcluidos'
  | 'chavesEntregues'

export type TipoCampoGateLead = 'textarea' | 'date' | 'checkbox' | 'imovel' | 'imovel-multi' | 'visitas' | 'number'

export const CAMPO_GATE_LEAD_CONFIG: Record<CampoGateLead, { label: string; tipo: TipoCampoGateLead }> = {
  observacoes: { label: 'Observações', tipo: 'textarea' },
  visitasAgendadas: { label: 'Visitas agendadas', tipo: 'visitas' },
  imovelNegociacaoId: { label: 'Imóveis da negociação', tipo: 'imovel-multi' },
  motivoStandby: { label: 'Motivo do standby (até 500 caracteres)', tipo: 'textarea' },
  motivoPerdido: { label: 'Motivo da perda (até 500 caracteres)', tipo: 'textarea' },
  pagamentosConcluidos: { label: 'Pagamentos concluídos', tipo: 'checkbox' },
  chavesEntregues: { label: 'Chaves entregues', tipo: 'checkbox' },
}

interface ResultadoTransicaoLead {
  tipo: 'avanco' | 'para_standby' | 'para_perdido' | 'reversao' | 'invalida'
  camposFaltantes: CampoGateLead[]
  requerConfirmacao: boolean
}

export function avaliarTransicaoLead(
  lead: Lead,
  destino: EtapaLead,
  patch: Partial<Lead> = {},
): ResultadoTransicaoLead {
  const origem = lead.etapa
  if (destino === origem) {
    return { tipo: 'invalida', camposFaltantes: [], requerConfirmacao: false }
  }

  if (destino === 7) {
    return { tipo: 'para_standby', camposFaltantes: ['motivoStandby'], requerConfirmacao: true }
  }
  if (destino === 8) {
    return { tipo: 'para_perdido', camposFaltantes: ['motivoPerdido'], requerConfirmacao: true }
  }

  if (origem === 7 || origem === 8) {
    return { tipo: 'reversao', camposFaltantes: [], requerConfirmacao: true }
  }

  const idxOrigem = ETAPA_LEAD_ORDEM.indexOf(origem)
  const idxDestino = ETAPA_LEAD_ORDEM.indexOf(destino)

  if (idxDestino === idxOrigem - 1) {
    return { tipo: 'reversao', camposFaltantes: [], requerConfirmacao: true }
  }

  if (idxDestino !== idxOrigem + 1) {
    return { tipo: 'invalida', camposFaltantes: [], requerConfirmacao: false }
  }

  // "Negócio Fechado" deixou de ser uma transição manual do lado do cliente:
  // quem decide que vendeu e preenche o valor é o corretor do imóvel
  // (decisão do PO — valor é dado do imóvel, não do cliente). O card do
  // cliente avança sozinho, como reação, quando o imóvel é marcado
  // "Vendido" do lado certo — ver MeusImoveisPage.tsx e
  // PLANO_ARQUITETURA_NEGOCIACOES_E_RLS.md §B.6.
  if (destino === 5) {
    return { tipo: 'invalida', camposFaltantes: [], requerConfirmacao: false }
  }

  const efetivo = { ...lead, ...patch }
  const faltantes: CampoGateLead[] = []

  if (destino === 2 && !efetivo.observacoes) faltantes.push('observacoes')
  if (destino === 3 && !(efetivo.visitasAgendadas && efetivo.visitasAgendadas.length > 0)) {
    faltantes.push('visitasAgendadas')
  }
  if (destino === 4 && !efetivo.imovelNegociacaoId) faltantes.push('imovelNegociacaoId')
  if (destino === 6) {
    if (!efetivo.pagamentosConcluidos) faltantes.push('pagamentosConcluidos')
    if (!efetivo.chavesEntregues) faltantes.push('chavesEntregues')
  }

  const requerConfirmacao = destino === 4 || destino === 6

  return { tipo: 'avanco', camposFaltantes: faltantes, requerConfirmacao }
}
