import { ETAPA_IMOVEL_ORDEM } from '@/domain/constants'
import type { EtapaImovel, Imovel } from '@/domain/types'

export type CampoGateImovel = 'cnm' | 'valorAnuncio' | 'linkAnuncioUrl' | 'metragem' | 'valorVenda' | 'leadNegociacaoId'

export const CAMPO_GATE_LABEL: Record<CampoGateImovel, string> = {
  cnm: 'CNM (Cadastro Nacional de Matrícula)',
  valorAnuncio: 'Valor de anúncio',
  linkAnuncioUrl: 'Link do anúncio',
  metragem: 'Metragem (área)',
  valorVenda: 'Valor de venda',
  leadNegociacaoId: 'Cliente da negociação',
}

/** patch usado apenas para avaliar o gate — não é persistido no Imovel */
interface PatchGateImovel extends Partial<Imovel> {
  leadNegociacaoId?: string
}

interface ResultadoTransicao {
  tipo: 'avanco' | 'reversao_e_d' | 'reversao_f_d' | 'reversao_f_e' | 'invalida'
  /** campos de dado faltantes que bloqueiam o avanço (pedidos via modal) */
  camposFaltantes: CampoGateImovel[]
  /** true quando a transição exige apenas uma confirmação (sem dado extra) */
  requerConfirmacao: boolean
}

function temMetragem(imovel: Imovel): boolean {
  return Boolean(imovel.areaPrivativaM2 || imovel.areaConstruidaM2 || imovel.areaTerrenoM2)
}

export function avaliarTransicaoImovel(
  imovel: Imovel,
  destino: EtapaImovel,
  patch: PatchGateImovel = {},
): ResultadoTransicao {
  const origem = imovel.etapa
  const idxOrigem = ETAPA_IMOVEL_ORDEM.indexOf(origem)
  const idxDestino = ETAPA_IMOVEL_ORDEM.indexOf(destino)

  if (origem === 'e' && destino === 'd') {
    return { tipo: 'reversao_e_d', camposFaltantes: [], requerConfirmacao: true }
  }
  if (origem === 'f' && destino === 'd') {
    return { tipo: 'reversao_f_d', camposFaltantes: [], requerConfirmacao: true }
  }
  // vendido pode voltar direto pra negociação (venda desfeita, mas o cliente
  // ainda negociando) — sem isso, só dava pra voltar até "Publicado", perdendo
  // o vínculo com o cliente mesmo quando a negociação continuava de pé
  if (origem === 'f' && destino === 'e') {
    return { tipo: 'reversao_f_e', camposFaltantes: [], requerConfirmacao: true }
  }

  if (idxDestino !== idxOrigem + 1) {
    return { tipo: 'invalida', camposFaltantes: [], requerConfirmacao: false }
  }

  const efetivo = { ...imovel, ...patch }
  const faltantes: CampoGateImovel[] = []

  if (destino === 'b' && !efetivo.cnm) faltantes.push('cnm')
  if (destino === 'c' && efetivo.valorAnuncio == null) faltantes.push('valorAnuncio')
  if (destino === 'd') {
    if (!efetivo.linkAnuncioUrl) faltantes.push('linkAnuncioUrl')
    if (!temMetragem(efetivo)) faltantes.push('metragem')
  }
  if (destino === 'e' && !efetivo.leadNegociacaoId) faltantes.push('leadNegociacaoId')
  if (destino === 'f') {
    if (efetivo.valorVenda == null) faltantes.push('valorVenda')
    // a venda precisa estar amarrada a um cliente — sem isso o card do
    // cliente nunca sabia que o imóvel dele tinha sido vendido
    if (!efetivo.leadNegociacaoId) faltantes.push('leadNegociacaoId')
  }

  const requerConfirmacao = destino === 'e' || destino === 'f'

  return { tipo: 'avanco', camposFaltantes: faltantes, requerConfirmacao }
}
