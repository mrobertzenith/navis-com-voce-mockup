import { ETAPA_IMOVEL_ORDEM } from '@/domain/constants'
import type { EtapaImovel, Imovel } from '@/domain/types'

export type CampoGateImovel = 'cnm' | 'valorAnuncio' | 'linkAnuncioUrl' | 'metragem'

export const CAMPO_GATE_LABEL: Record<CampoGateImovel, string> = {
  cnm: 'CNM (Cadastro Nacional de Matrícula)',
  valorAnuncio: 'Valor de anúncio',
  linkAnuncioUrl: 'Link do anúncio',
  metragem: 'Metragem (área)',
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
  // vendido pode voltar direto pra negociação (venda desfeita, mas o cliente
  // ainda negociando) — sem isso, só dava pra voltar até "Publicado", perdendo
  // o vínculo com o cliente mesmo quando a negociação continuava de pé
  if (origem === 'f' && destino === 'e') {
    return { tipo: 'reversao_f_e', camposFaltantes: [], requerConfirmacao: true }
  }

  if (idxDestino !== idxOrigem + 1) {
    return { tipo: 'invalida', camposFaltantes: [], requerConfirmacao: false }
  }

  // Decisão do PO (14/09/2026): o card do imóvel é passivo em toda a parte
  // de negociação — não entra em "Em negociação" nem sai vendido por um
  // drag direto. Quem move é sempre o corretor do cliente; o corretor do
  // imóvel só age de duas formas: aprovando a entrada em negociação
  // (NotificacoesPage) e informando o valor pra confirmar a venda, depois
  // que o cliente já fechou (idem). Ver
  // PLANO_TRIGGER_SINCRONIA_NEGOCIACAO.md §A.5.
  if (destino === 'e' || destino === 'f') {
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
  // destino === 'e'/'f' não chegam mais aqui — viram 'invalida' acima

  return { tipo: 'avanco', camposFaltantes: faltantes, requerConfirmacao: false }
}
