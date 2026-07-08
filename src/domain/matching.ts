import { PESO_ETAPA_LEAD } from '@/domain/constants'
import type { Imovel, Lead, MatchResult, PerfilBusca, PesosScore } from '@/domain/types'
import { encontrarBairro } from '@/mocks/data/bairros'

const TOLERANCIA_PRECO = 0.05

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

/**
 * Sem geocoding real de CEP no mockup: o "centro de busca" do lead é aproximado
 * pela média das coordenadas dos bairros que ele selecionou na mesma cidade.
 */
function centroDeBusca(perfil: PerfilBusca): { lat: number; lng: number } | undefined {
  const coords = perfil.bairros
    .map((b) => encontrarBairro(perfil.cidade, b))
    .filter((b): b is NonNullable<typeof b> => Boolean(b))
  if (coords.length === 0) return undefined
  const lat = coords.reduce((s, c) => s + c.lat, 0) / coords.length
  const lng = coords.reduce((s, c) => s + c.lng, 0) / coords.length
  return { lat, lng }
}

interface ResultadoGate {
  passou: boolean
  bairroExato: boolean
}

function avaliarGateLocalizacao(imovel: Imovel, perfil: PerfilBusca): ResultadoGate {
  if (imovel.cidade !== perfil.cidade) return { passou: false, bairroExato: false }

  const bairroExato = perfil.bairros.includes(imovel.bairro)
  if (bairroExato) return { passou: true, bairroExato: true }

  const centro = centroDeBusca(perfil)
  if (!centro) return { passou: false, bairroExato: false }
  const distancia = haversineKm(imovel.lat, imovel.lng, centro.lat, centro.lng)
  return { passou: distancia <= perfil.raioKm, bairroExato: false }
}

/** Preço de referência para o gate: usa o anúncio quando existe, senão o valor estimado. */
function valorReferencia(imovel: Imovel): number | undefined {
  return imovel.valorAnuncio ?? imovel.valorEstimado
}

function avaliarGatePreco(imovel: Imovel, perfil: PerfilBusca): { passou: boolean; dentroExato: boolean } {
  const valor = valorReferencia(imovel)
  if (valor == null) return { passou: true, dentroExato: false } // sem nenhuma referência de valor — gate ignorado
  const piso = perfil.valorDe
  const teto = perfil.valorAte

  const dentroExato = (piso == null || valor >= piso) && (teto == null || valor <= teto)
  if (dentroExato) return { passou: true, dentroExato: true }

  const pisoTolerado = piso != null ? piso * (1 - TOLERANCIA_PRECO) : null
  const tetoTolerado = teto != null ? teto * (1 + TOLERANCIA_PRECO) : null
  const dentroTolerancia =
    (pisoTolerado == null || valor >= pisoTolerado) && (tetoTolerado == null || valor <= tetoTolerado)

  return { passou: dentroTolerancia, dentroExato: false }
}

export function passaGates(imovel: Imovel, perfil: PerfilBusca): boolean {
  if (!perfil.tipos.includes(imovel.tipo)) return false
  if (!avaliarGateLocalizacao(imovel, perfil).passou) return false
  if (!avaliarGatePreco(imovel, perfil).passou) return false
  return true
}

function precisaoQuantitativo(valorImovel: number, min: number | undefined): number | null {
  if (min == null) return null
  const diff = valorImovel - min
  if (diff >= 0) return 1
  if (diff === -1) return 0.5
  return 0
}

function precisaoMinimoRigido(valorImovel: number, min: number | undefined): number | null {
  if (min == null) return null
  return valorImovel >= min ? 1 : 0
}

function areaPrincipal(imovel: Imovel): number | undefined {
  return imovel.areaPrivativaM2 ?? imovel.areaConstruidaM2 ?? imovel.areaTerrenoM2
}

function precisaoArea(imovel: Imovel, perfil: PerfilBusca): number | null {
  if (perfil.areaDe == null && perfil.areaAte == null) return null
  const area = areaPrincipal(imovel)
  if (area == null) return null
  const de = perfil.areaDe ?? 0
  const ate = perfil.areaAte ?? Infinity
  if (area >= de && area <= ate) return 1
  const limite = area < de ? de : ate
  const diffPct = Math.abs(area - limite) / limite
  return diffPct <= 0.1 ? 0.6 : 0
}

function precisaoBooleana(desejado: boolean | undefined, imovelTem: boolean | undefined): number | null {
  if (!desejado) return null
  return imovelTem ? 1 : 0
}

/** Calcula o score do imóvel (0–1) para um perfil de busca, dado os pesos do corretor. */
export function calcularScoreImovel(imovel: Imovel, perfil: PerfilBusca, pesos: PesosScore): number {
  const gateLocalizacao = avaliarGateLocalizacao(imovel, perfil)
  const gatePreco = avaliarGatePreco(imovel, perfil)

  const contribuicoes: Array<{ peso: number; precisao: number }> = []

  contribuicoes.push({
    peso: pesos.bairro_exato_vs_raio,
    precisao: gateLocalizacao.bairroExato ? 1 : 0.7,
  })

  if (valorReferencia(imovel) != null) {
    contribuicoes.push({
      peso: pesos.preco_dentro_vs_tolerancia,
      precisao: gatePreco.dentroExato ? 1 : 0.7,
    })
  }

  const quartos = precisaoQuantitativo(imovel.quartos, perfil.quartosMin)
  if (quartos != null) contribuicoes.push({ peso: pesos.quartos, precisao: quartos })

  const suites = precisaoQuantitativo(imovel.suites, perfil.suitesMin)
  if (suites != null) contribuicoes.push({ peso: pesos.suites, precisao: suites })

  const vagas = precisaoMinimoRigido(imovel.vagas, perfil.vagasMin)
  if (vagas != null) contribuicoes.push({ peso: pesos.vagas, precisao: vagas })

  const banheiros = precisaoMinimoRigido(imovel.banheiros, perfil.banheirosMin)
  if (banheiros != null) contribuicoes.push({ peso: pesos.banheiros, precisao: banheiros })

  const area = precisaoArea(imovel, perfil)
  if (area != null) contribuicoes.push({ peso: pesos.area, precisao: area })

  const booleanas: Array<[keyof PesosScore, boolean | undefined, boolean | undefined]> = [
    ['elevador', perfil.elevador, imovel.elevador],
    ['mobiliado', perfil.mobiliado, imovel.mobiliado],
    ['lazer', perfil.lazer, imovel.lazer],
    ['varanda', perfil.varanda, imovel.varanda],
    ['churrasqueira', perfil.churrasqueira, imovel.churrasqueira],
    ['aceita_pet', perfil.aceitaPet, imovel.aceitaPet],
  ]
  for (const [atributo, desejado, tem] of booleanas) {
    const precisao = precisaoBooleana(desejado, tem)
    if (precisao != null) contribuicoes.push({ peso: pesos[atributo], precisao })
  }

  if (perfil.nomeCondominio) {
    const match = imovel.nomeCondominio?.toLowerCase() === perfil.nomeCondominio.toLowerCase()
    contribuicoes.push({ peso: pesos.nome_condominio_match, precisao: match ? 1 : 0 })
  }

  const somaPesos = contribuicoes.reduce((s, c) => s + c.peso, 0)
  if (somaPesos === 0) return 0
  const somaContribuicoes = contribuicoes.reduce((s, c) => s + c.peso * c.precisao, 0)
  const scoreBase = somaContribuicoes / somaPesos

  const isAviso = valorReferencia(imovel) == null
  return isAviso ? scoreBase * 0.5 : scoreBase
}

/** Calcula o score do lead (0–1): peso da etapa × decaimento em standby. */
export function calcularScoreLead(lead: Lead): number {
  const pesoEtapa = PESO_ETAPA_LEAD[lead.etapa]
  if (pesoEtapa === 0) return 0

  if (lead.etapa === 7 && lead.dataEntradaStandby) {
    const diasEmStandby = Math.floor(
      (Date.now() - new Date(lead.dataEntradaStandby).getTime()) / (1000 * 60 * 60 * 24),
    )
    const decaimento = 0.8 ** Math.floor(diasEmStandby / 30)
    return pesoEtapa * decaimento
  }

  return pesoEtapa
}

export function calcularMatch(imovel: Imovel, lead: Lead, pesos: PesosScore): MatchResult | null {
  const scoreLead = calcularScoreLead(lead)
  if (scoreLead === 0) return null
  if (!passaGates(imovel, lead.perfilBusca)) return null

  const scoreImovel = calcularScoreImovel(imovel, lead.perfilBusca, pesos)
  const scoreFinal = Math.round(scoreImovel * scoreLead * 100)

  return {
    imovelId: imovel.id,
    leadId: lead.id,
    score: Math.max(0, Math.min(100, scoreFinal)),
    isAviso: valorReferencia(imovel) == null,
  }
}
