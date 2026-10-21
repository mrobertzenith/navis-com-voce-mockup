import { describe, expect, it } from 'vitest'
import {
  calcularRanking,
  limitesDoPeriodo,
  paraVisaoPublica,
  periodoValido,
  type CorretorParaRanking,
  type VendaParaRanking,
} from '@/domain/ranking'

const A: CorretorParaRanking = { id: 'a', nome: 'Ana', cidade: 'Ribeirão Preto', estado: 'SP' }
const B: CorretorParaRanking = { id: 'b', nome: 'Bruno', cidade: 'Ribeirão Preto', estado: 'SP' }

function venda(corretor: string, valor: number, dataVenda: string, revertida = false): VendaParaRanking {
  return { corretorImovelId: corretor, valorVenda: valor, dataVenda, revertida }
}

describe('limitesDoPeriodo — horário de Brasília (UTC−3)', () => {
  it('mês: de 00h BRT do dia 1 até 00h BRT do dia 1 seguinte', () => {
    expect(limitesDoPeriodo({ tipo: 'mes', ano: 2026, indice: 9 })).toEqual({
      inicio: '2026-10-01T03:00:00.000Z',
      fim: '2026-11-01T03:00:00.000Z',
    })
  })

  it('dezembro vira o ano', () => {
    expect(limitesDoPeriodo({ tipo: 'mes', ano: 2026, indice: 11 })?.fim).toBe('2027-01-01T03:00:00.000Z')
  })

  it('trimestre, semestre e ano cobrem o intervalo certo', () => {
    expect(limitesDoPeriodo({ tipo: 'trimestre', ano: 2026, indice: 2 })).toEqual({
      inicio: '2026-07-01T03:00:00.000Z',
      fim: '2026-10-01T03:00:00.000Z',
    })
    expect(limitesDoPeriodo({ tipo: 'semestre', ano: 2026, indice: 1 })).toEqual({
      inicio: '2026-07-01T03:00:00.000Z',
      fim: '2027-01-01T03:00:00.000Z',
    })
    expect(limitesDoPeriodo({ tipo: 'ano', ano: 2026, indice: 0 })).toEqual({
      inicio: '2026-01-01T03:00:00.000Z',
      fim: '2027-01-01T03:00:00.000Z',
    })
  })

  it('"tudo" não tem limite', () => {
    expect(limitesDoPeriodo({ tipo: 'tudo', ano: 2026, indice: 0 })).toBeNull()
  })
})

describe('periodoValido — o servidor recebe isso do cliente', () => {
  it('aceita períodos bem formados', () => {
    expect(periodoValido({ tipo: 'mes', ano: 2026, indice: 11 })).toBe(true)
    expect(periodoValido({ tipo: 'tudo' })).toBe(true)
    expect(periodoValido({ tipo: 'ano', ano: 2026 })).toBe(true)
  })

  it('recusa lixo, índice fora da faixa e ano absurdo', () => {
    expect(periodoValido(null)).toBe(false)
    expect(periodoValido({ tipo: 'decada', ano: 2026, indice: 0 })).toBe(false)
    expect(periodoValido({ tipo: 'mes', ano: 2026, indice: 12 })).toBe(false)
    expect(periodoValido({ tipo: 'trimestre', ano: 2026, indice: 4 })).toBe(false)
    expect(periodoValido({ tipo: 'semestre', ano: 2026, indice: -1 })).toBe(false)
    expect(periodoValido({ tipo: 'ano', ano: 9999 })).toBe(false)
    expect(periodoValido({ tipo: 'mes', ano: '2026', indice: 1 })).toBe(false)
  })
})

describe('calcularRanking — VGV executado', () => {
  const outubro = limitesDoPeriodo({ tipo: 'mes', ano: 2026, indice: 9 })

  it('soma só as vendas do período e ignora as revertidas', () => {
    const vendas = [
      venda('a', 500_000, '2026-10-10T15:00:00.000Z'),
      venda('a', 300_000, '2026-10-20T15:00:00.000Z'),
      venda('a', 900_000, '2026-10-21T15:00:00.000Z', true), // revertida: não conta
      venda('a', 700_000, '2026-09-15T15:00:00.000Z'), // outro mês
      venda('b', 400_000, '2026-10-05T15:00:00.000Z'),
    ]
    const r = calcularRanking([A, B], vendas, [], outubro)
    expect(r.find((l) => l.corretorId === 'a')).toMatchObject({ vgv: 800_000, vendas: 2 })
    expect(r.find((l) => l.corretorId === 'b')).toMatchObject({ vgv: 400_000, vendas: 1 })
  })

  it('venda de 31/out às 22h BRT (01h UTC de 1/nov) conta em outubro, não em novembro', () => {
    const v = [venda('a', 100_000, '2026-11-01T01:00:00.000Z')]
    const nov = limitesDoPeriodo({ tipo: 'mes', ano: 2026, indice: 10 })
    expect(calcularRanking([A], v, [], outubro)[0].vgv).toBe(100_000)
    expect(calcularRanking([A], v, [], nov)[0].vgv).toBe(0)
  })

  it('o limite inicial é inclusivo e o final é exclusivo', () => {
    const v = [
      venda('a', 1, '2026-10-01T03:00:00.000Z'), // 00h BRT de 1/out: entra
      venda('a', 10, '2026-11-01T03:00:00.000Z'), // 00h BRT de 1/nov: já é novembro
    ]
    expect(calcularRanking([A], v, [], outubro)[0]).toMatchObject({ vgv: 1, vendas: 1 })
  })

  it('"todo o período" soma tudo', () => {
    const v = [venda('a', 1, '2020-01-01T10:00:00.000Z'), venda('a', 2, '2026-10-01T10:00:00.000Z')]
    expect(calcularRanking([A], v, [], null)[0].vgv).toBe(3)
  })

  it('corretor sem venda no período aparece com zero', () => {
    expect(calcularRanking([A, B], [], [], outubro).every((l) => l.vgv === 0 && l.vendas === 0)).toBe(true)
  })
})

describe('paraVisaoPublica', () => {
  it('zera os campos gerenciais e preserva vendas e VGV', () => {
    const r = paraVisaoPublica([
      { corretorId: 'a', nome: 'Ana', cidade: 'x', estado: 'SP', vendas: 2, vgv: 800_000, conversao: 90, colaboracao: 50, score: 77 },
    ])
    expect(r[0]).toMatchObject({ vendas: 2, vgv: 800_000, conversao: null, colaboracao: null, score: 0 })
  })
})
