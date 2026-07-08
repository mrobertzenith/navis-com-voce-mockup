import { describe, expect, it } from 'vitest'
import { calcularMatch, passaGates } from '@/domain/matching'
import { PESOS_SCORE_DEFAULT } from '@/domain/constants'
import type { Imovel, Lead, PerfilBusca } from '@/domain/types'

function imovelBase(overrides: Partial<Imovel> = {}): Imovel {
  return {
    id: 'im-test',
    corretorResponsavelId: 'cor-1',
    etapa: 'd',
    enderecoRua: 'Rua Teste',
    enderecoNumero: '1',
    bairro: 'Jardim Sumaré',
    cidade: 'Ribeirão Preto',
    estado: 'SP',
    cep: '00000-000',
    lat: -21.1782,
    lng: -47.8113,
    tipo: 'apartamento',
    valorAnuncio: 480000,
    quartos: 3,
    suites: 1,
    vagas: 2,
    banheiros: 2,
    areaPrivativaM2: 85,
    emNegociacaoFlag: false,
    criadoEm: '2026-01-01T00:00:00.000Z',
    atualizadoEm: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function perfilBase(overrides: Partial<PerfilBusca> = {}): PerfilBusca {
  return {
    id: 'pb-test',
    leadId: 'lead-test',
    estado: 'SP',
    cidade: 'Ribeirão Preto',
    bairros: ['Jardim Sumaré'],
    raioKm: 5,
    tipos: ['apartamento'],
    valorDe: 400000,
    valorAte: 500000,
    ...overrides,
  }
}

function leadBase(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead-test',
    codigo: 'Lead #0001',
    corretorResponsavelId: 'cor-1',
    etapa: 2,
    nome: 'Teste',
    perfilBusca: perfilBase(),
    dataCadastro: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('passaGates', () => {
  it('passa quando tipo, localização e preço batem', () => {
    expect(passaGates(imovelBase(), perfilBase())).toBe(true)
  })

  it('falha quando o tipo não bate', () => {
    expect(passaGates(imovelBase({ tipo: 'casa_rua' }), perfilBase())).toBe(false)
  })

  it('falha quando a cidade é diferente, mesmo dentro do raio (cidade é critério forte)', () => {
    const imovel = imovelBase({ cidade: 'Campinas', bairro: 'Cambuí', lat: -22.8891, lng: -47.0575 })
    expect(passaGates(imovel, perfilBase())).toBe(false)
  })

  it('falha quando o preço está fora da tolerância de 5%', () => {
    const imovel = imovelBase({ valorAnuncio: 600000 })
    expect(passaGates(imovel, perfilBase())).toBe(false)
  })

  it('passa quando o preço está dentro da tolerância de 5%', () => {
    const imovel = imovelBase({ valorAnuncio: 520000 }) // 500000 * 1.05 = 525000
    expect(passaGates(imovel, perfilBase())).toBe(true)
  })

  it('imóvel sem nenhuma referência de valor (nem anúncio, nem estimado) ignora o gate de preço', () => {
    const imovel = imovelBase({ valorAnuncio: undefined, valorEstimado: undefined, etapa: 'a' })
    expect(passaGates(imovel, perfilBase())).toBe(true)
  })

  it('imóvel sem valor de anúncio mas com valor estimado fora da tolerância falha o gate de preço', () => {
    const imovel = imovelBase({ valorAnuncio: undefined, valorEstimado: 1150000, etapa: 'b' })
    expect(passaGates(imovel, perfilBase())).toBe(false)
  })

  it('imóvel sem valor de anúncio mas com valor estimado dentro da tolerância passa o gate de preço', () => {
    const imovel = imovelBase({ valorAnuncio: undefined, valorEstimado: 490000, etapa: 'b' })
    expect(passaGates(imovel, perfilBase())).toBe(true)
  })
})

describe('calcularMatch', () => {
  it('retorna null quando os gates não passam', () => {
    const imovel = imovelBase({ tipo: 'casa_rua' })
    expect(calcularMatch(imovel, leadBase(), PESOS_SCORE_DEFAULT)).toBeNull()
  })

  it('retorna null para lead em etapa sem participação (5, 6, 8)', () => {
    const imovel = imovelBase()
    expect(calcularMatch(imovel, leadBase({ etapa: 8 }), PESOS_SCORE_DEFAULT)).toBeNull()
  })

  it('score mais alto quando bairro é exato do que quando é só por raio', () => {
    const imovelBairroExato = imovelBase()
    const imovelForaBairro = imovelBase({ bairro: 'Ribeirânia', lat: -21.1633, lng: -47.8465 })

    const matchExato = calcularMatch(imovelBairroExato, leadBase(), PESOS_SCORE_DEFAULT)
    const matchRaio = calcularMatch(imovelForaBairro, leadBase(), PESOS_SCORE_DEFAULT)

    expect(matchExato).not.toBeNull()
    expect(matchRaio).not.toBeNull()
    expect(matchExato!.score).toBeGreaterThan(matchRaio!.score)
  })

  it('marca isAviso e reduz o score pela metade quando o imóvel ainda não tem valor de anúncio', () => {
    const imovelComValor = imovelBase()
    const imovelSemValor = imovelBase({ valorAnuncio: undefined, etapa: 'a' })

    const comValor = calcularMatch(imovelComValor, leadBase(), PESOS_SCORE_DEFAULT)
    const semValor = calcularMatch(imovelSemValor, leadBase(), PESOS_SCORE_DEFAULT)

    expect(comValor?.isAviso).toBe(false)
    expect(semValor?.isAviso).toBe(true)
    expect(semValor!.score).toBeLessThan(comValor!.score)
  })

  it('score decai para lead em standby proporcional aos dias parado', () => {
    const imovel = imovelBase()
    const leadRecemStandby = leadBase({
      etapa: 7,
      dataEntradaStandby: new Date().toISOString(),
    })
    const leadStandbyAntigo = leadBase({
      etapa: 7,
      dataEntradaStandby: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000).toISOString(),
    })

    const matchRecente = calcularMatch(imovel, leadRecemStandby, PESOS_SCORE_DEFAULT)
    const matchAntigo = calcularMatch(imovel, leadStandbyAntigo, PESOS_SCORE_DEFAULT)

    expect(matchRecente!.score).toBeGreaterThan(matchAntigo!.score)
  })
})
