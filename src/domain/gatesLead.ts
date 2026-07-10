import { ETAPA_LEAD_ORDEM } from '@/domain/constants'
import type { EtapaLead, Lead } from '@/domain/types'

export type CampoGateLead =
  | 'observacoes'
  | 'visitasAgendadas'
  | 'imovelNegociacaoId'
  | 'imovelFechadoId'
  | 'valorNegociado'
  | 'motivoStandby'
  | 'motivoPerdido'
  | 'pagamentosConcluidos'
  | 'chavesEntregues'

export type TipoCampoGateLead = 'textarea' | 'date' | 'checkbox' | 'imovel' | 'imovel-multi' | 'visitas' | 'number'

export const CAMPO_GATE_LEAD_CONFIG: Record<CampoGateLead, { label: string; tipo: TipoCampoGateLead }> = {
  observacoes: { label: 'Observações', tipo: 'textarea' },
  visitasAgendadas: { label: 'Visitas agendadas', tipo: 'visitas' },
  imovelNegociacaoId: { label: 'Imóveis da negociação', tipo: 'imovel-multi' },
  imovelFechadoId: { label: 'Imóvel do negócio', tipo: 'imovel' },
  valorNegociado: { label: 'Valor negociado', tipo: 'number' },
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
  if (idxDestino !== idxOrigem + 1) {
    return { tipo: 'invalida', camposFaltantes: [], requerConfirmacao: false }
  }

  const efetivo = { ...lead, ...patch }
  const faltantes: CampoGateLead[] = []

  if (destino === 2 && !efetivo.observacoes) faltantes.push('observacoes')
  if (destino === 3 && !(efetivo.visitasAgendadas && efetivo.visitasAgendadas.length > 0)) {
    faltantes.push('visitasAgendadas')
  }
  if (destino === 4 && !efetivo.imovelNegociacaoId) faltantes.push('imovelNegociacaoId')
  if (destino === 5) {
    if (!efetivo.imovelFechadoId) faltantes.push('imovelFechadoId')
    if (efetivo.valorNegociado == null) faltantes.push('valorNegociado')
  }
  if (destino === 6) {
    if (!efetivo.pagamentosConcluidos) faltantes.push('pagamentosConcluidos')
    if (!efetivo.chavesEntregues) faltantes.push('chavesEntregues')
  }

  const requerConfirmacao = destino === 4 || destino === 5 || destino === 6

  return { tipo: 'avanco', camposFaltantes: faltantes, requerConfirmacao }
}
