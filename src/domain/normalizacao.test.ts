import { describe, expect, it } from 'vitest'
import { encontrarEquivalente, mesmoLocal, normalizarLocal } from '@/domain/normalizacao'

describe('normalizarLocal — variações do mesmo bairro', () => {
  // casos levantados no documento de usabilidade da Navis
  it('reconhece acentuação e caixa diferentes', () => {
    expect(mesmoLocal('Jardim Botânico', 'jardim botanico')).toBe(true)
    expect(mesmoLocal('JARDIM BOTÂNICO', 'Jardim Botanico')).toBe(true)
  })

  it('reconhece abreviações com e sem ponto', () => {
    expect(mesmoLocal('Jardim Botânico', 'Jd. Botanico')).toBe(true)
    expect(mesmoLocal('Jardim Botânico', 'jd Botanico')).toBe(true)
    expect(mesmoLocal('Jardim Botânico', 'JD BOTÂNICO')).toBe(true)
  })

  it('reconhece apóstrofo escrito de várias formas', () => {
    expect(mesmoLocal("Olhos d'Água", 'Olhos dagua')).toBe(true)
    expect(mesmoLocal("Olhos d'Água", 'Olhos d Agua')).toBe(true)
    expect(mesmoLocal("Olhos d'Água", 'olhos d’agua')).toBe(true)
  })

  it('ignora espaços extras e palavras de ligação', () => {
    expect(mesmoLocal('  Vila   Seixas ', 'vila seixas')).toBe(true)
    expect(mesmoLocal('Jardim das Flores', 'Jardim Flores')).toBe(true)
  })

  it('outras abreviações comuns de endereço', () => {
    expect(mesmoLocal('Vl. Tibério', 'Vila Tiberio')).toBe(true)
    expect(mesmoLocal('Pq. Industrial', 'Parque Industrial')).toBe(true)
    expect(mesmoLocal('Res. Flórida', 'Residencial Florida')).toBe(true)
    expect(mesmoLocal('Sta. Cruz', 'Santa Cruz')).toBe(true)
  })

  // achado na rodada 03: "RESIDENCIAL ALTO DO CASTELO" (cadastro do imóvel) x
  // "ALTO DO CASTELO" (perfil do cliente, sem "residencial") não batiam
  it('reconhece o mesmo bairro com e sem o qualificador genérico (residencial, jardim, vila…)', () => {
    expect(mesmoLocal('Residencial Alto do Castelo', 'Alto do Castelo')).toBe(true)
    expect(mesmoLocal('Jardim Botânico', 'Botânico')).toBe(true)
    expect(mesmoLocal('Vila Seixas', 'Seixas')).toBe(true)
  })

  it('não confunde bairros diferentes', () => {
    expect(mesmoLocal('Jardim Botânico', 'Jardim Paulista')).toBe(false)
    expect(mesmoLocal('Centro', 'Centro Norte')).toBe(false)
    expect(mesmoLocal('Vila Seixas', 'Vila Tibério')).toBe(false)
    expect(mesmoLocal('Alto da Boa Vista', 'Boa Vista')).toBe(false)
  })

  it('forma normalizada é estável e comparável', () => {
    expect(normalizarLocal('Jd. Botânico')).toBe(normalizarLocal('Jardim Botanico'))
    expect(normalizarLocal('')).toBe('')
  })
})

describe('encontrarEquivalente — evita duplicar bairro na lista', () => {
  const jaCadastrados = ['Jardim Botânico', 'Centro', "Olhos d'Água"]

  it('devolve o nome já usado quando é o mesmo lugar', () => {
    expect(encontrarEquivalente('jd botanico', jaCadastrados)).toBe('Jardim Botânico')
    expect(encontrarEquivalente('olhos dagua', jaCadastrados)).toBe("Olhos d'Água")
  })

  it('devolve undefined para bairro realmente novo', () => {
    expect(encontrarEquivalente('Ribeirânia', jaCadastrados)).toBeUndefined()
  })
})
