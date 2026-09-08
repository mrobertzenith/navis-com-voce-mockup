import { describe, expect, it } from 'vitest'
import { avaliarTransicaoImovel } from '@/domain/gatesImovel'
import type { Imovel } from '@/domain/types'

// Cobertura direta da lógica de gate do lado do imóvel — espelha gatesLead.test.ts.
// Ver ESTRATEGIA_QA.md §1.2: esta era, junto com gatesLead.ts, a área de zero
// cobertura com maior densidade histórica de bugs reais.

function imovelBase(overrides: Partial<Imovel> = {}): Imovel {
  return {
    id: 'im-test',
    corretorResponsavelId: 'cor-1',
    etapa: 'a',
    enderecoRua: 'Rua Teste',
    enderecoNumero: '1',
    bairro: 'Jardim Sumaré',
    cidade: 'Ribeirão Preto',
    estado: 'SP',
    cep: '00000-000',
    lat: -21.1782,
    lng: -47.8113,
    tipo: 'apartamento',
    quartos: 3,
    suites: 1,
    vagas: 2,
    banheiros: 2,
    emNegociacaoFlag: false,
    criadoEm: '2026-01-01T00:00:00.000Z',
    atualizadoEm: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('avaliarTransicaoImovel', () => {
  it('pular mais de uma etapa para frente é inválido', () => {
    const r = avaliarTransicaoImovel(imovelBase({ etapa: 'a' }), 'c')
    expect(r.tipo).toBe('invalida')
  })

  it('voltar mais de uma etapa (fora dos casos especiais) é inválido', () => {
    const r = avaliarTransicaoImovel(imovelBase({ etapa: 'd' }), 'a')
    expect(r.tipo).toBe('invalida')
  })

  describe('etapa b — Análise e Estudo: exige CNM', () => {
    it('bloqueia sem cnm', () => {
      const r = avaliarTransicaoImovel(imovelBase({ etapa: 'a' }), 'b')
      expect(r.tipo).toBe('avanco')
      expect(r.camposFaltantes).toEqual(['cnm'])
    })

    it('libera com cnm preenchido', () => {
      const r = avaliarTransicaoImovel(imovelBase({ etapa: 'a', cnm: '12345' }), 'b')
      expect(r.camposFaltantes).toEqual([])
    })

    it('libera com cnm vindo só do patch', () => {
      const r = avaliarTransicaoImovel(imovelBase({ etapa: 'a' }), 'b', { cnm: '12345' })
      expect(r.camposFaltantes).toEqual([])
    })
  })

  describe('etapa c — Produção: exige valor de anúncio', () => {
    it('bloqueia sem valorAnuncio', () => {
      const r = avaliarTransicaoImovel(imovelBase({ etapa: 'b' }), 'c')
      expect(r.camposFaltantes).toEqual(['valorAnuncio'])
    })

    it('valorAnuncio igual a zero conta como preenchido (== null, não == 0)', () => {
      const r = avaliarTransicaoImovel(imovelBase({ etapa: 'b', valorAnuncio: 0 }), 'c')
      expect(r.camposFaltantes).toEqual([])
    })

    it('libera com valorAnuncio preenchido', () => {
      const r = avaliarTransicaoImovel(imovelBase({ etapa: 'b', valorAnuncio: 500000 }), 'c')
      expect(r.camposFaltantes).toEqual([])
    })
  })

  describe('etapa d — Publicado: exige link do anúncio e alguma metragem', () => {
    it('lista os dois campos quando ambos faltam', () => {
      const r = avaliarTransicaoImovel(imovelBase({ etapa: 'c' }), 'd')
      expect(r.camposFaltantes).toEqual(['linkAnuncioUrl', 'metragem'])
    })

    it('aceita qualquer uma das três áreas como metragem válida', () => {
      const base = { etapa: 'c' as const, linkAnuncioUrl: 'https://x.com/1' }
      expect(
        avaliarTransicaoImovel(imovelBase({ ...base, areaPrivativaM2: 80 }), 'd').camposFaltantes,
      ).toEqual([])
      expect(
        avaliarTransicaoImovel(imovelBase({ ...base, areaConstruidaM2: 80 }), 'd').camposFaltantes,
      ).toEqual([])
      expect(
        avaliarTransicaoImovel(imovelBase({ ...base, areaTerrenoM2: 300 }), 'd').camposFaltantes,
      ).toEqual([])
    })

    it('área igual a zero NÃO conta como metragem preenchida (Boolean(0) é falso — cuidado ao mexer aqui)', () => {
      const r = avaliarTransicaoImovel(
        imovelBase({ etapa: 'c', linkAnuncioUrl: 'https://x.com/1', areaPrivativaM2: 0 }),
        'd',
      )
      expect(r.camposFaltantes).toEqual(['metragem'])
    })
  })

  describe('etapa e — Em negociação: exige o cliente da negociação e confirmação', () => {
    it('bloqueia sem leadNegociacaoId', () => {
      const r = avaliarTransicaoImovel(imovelBase({ etapa: 'd' }), 'e')
      expect(r.camposFaltantes).toEqual(['leadNegociacaoId'])
      expect(r.requerConfirmacao).toBe(true)
    })

    it('libera com leadNegociacaoId vindo do patch (é campo transiente, não persistido no Imovel)', () => {
      const r = avaliarTransicaoImovel(imovelBase({ etapa: 'd' }), 'e', { leadNegociacaoId: 'lead-1' })
      expect(r.camposFaltantes).toEqual([])
    })
  })

  describe('etapa f — Vendido: exige valor de venda', () => {
    it('bloqueia sem valorVenda', () => {
      const r = avaliarTransicaoImovel(imovelBase({ etapa: 'e' }), 'f')
      expect(r.camposFaltantes).toEqual(['valorVenda'])
      expect(r.requerConfirmacao).toBe(true)
    })

    it('libera com valorVenda preenchido', () => {
      const r = avaliarTransicaoImovel(imovelBase({ etapa: 'e', valorVenda: 480000 }), 'f')
      expect(r.camposFaltantes).toEqual([])
    })
  })

  describe('reversões especiais — voltar de negociação ou de vendido para Publicado', () => {
    it('e → d é reversão explícita, sem campo faltante, com confirmação', () => {
      const r = avaliarTransicaoImovel(imovelBase({ etapa: 'e' }), 'd')
      expect(r.tipo).toBe('reversao_e_d')
      expect(r.requerConfirmacao).toBe(true)
      expect(r.camposFaltantes).toEqual([])
    })

    it('f → d é reversão explícita, sem campo faltante, com confirmação', () => {
      const r = avaliarTransicaoImovel(imovelBase({ etapa: 'f' }), 'd')
      expect(r.tipo).toBe('reversao_f_d')
      expect(r.requerConfirmacao).toBe(true)
    })
  })
})
