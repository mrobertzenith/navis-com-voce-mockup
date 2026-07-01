import { ETAPA_IMOVEL_ORDEM } from '@/domain/constants'
import type { EtapaImovel, Imovel } from '@/domain/types'

export type CampoGateImovel = 'cib' | 'valorAnuncio' | 'linkAnuncioUrl' | 'metragem' | 'valorVenda'

export const CAMPO_GATE_LABEL: Record<CampoGateImovel, string> = {
  cib: 'CIB',
  valorAnuncio: 'Valor de anúncio',
  linkAnuncioUrl: 'Link do anúncio',
  metragem: 'Metragem (área)',
  valorVenda: 'Valor de venda',
}

interface ResultadoTransicao {
  tipo: 'avanco' | 'reversao_e_d' | 'reversao_f_d' | 'invalida'
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
  patch: Partial<Imovel> = {},
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

  if (idxDestino !== idxOrigem + 1) {
    return { tipo: 'invalida', camposFaltantes: [], requerConfirmacao: false }
  }

  const efetivo = { ...imovel, ...patch }
  const faltantes: CampoGateImovel[] = []

  if (destino === 'b' && !efetivo.cib) faltantes.push('cib')
  if (destino === 'c' && efetivo.valorAnuncio == null) faltantes.push('valorAnuncio')
  if (destino === 'd') {
    if (!efetivo.linkAnuncioUrl) faltantes.push('linkAnuncioUrl')
    if (!temMetragem(efetivo)) faltantes.push('metragem')
  }
  if (destino === 'f' && efetivo.valorVenda == null) faltantes.push('valorVenda')

  const requerConfirmacao = destino === 'e' || destino === 'f'

  return { tipo: 'avanco', camposFaltantes: faltantes, requerConfirmacao }
}
