import { describe, expect, it } from 'vitest'
import { avaliarTransicaoLead } from '@/domain/gatesLead'
import type { Lead } from '@/domain/types'

// Cobertura direta da lógica que decidiu bugs reais em duas rodadas de teste de uso
// (cadastro incompleto avançando de etapa sem qualificação — ver ESTRATEGIA_QA.md §1.2).
// Qualquer PR que altere avaliarTransicaoLead sem tocar este arquivo deveria levantar
// suspeita na revisão.

function leadBase(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead-test',
    codigo: 'Lead #0001',
    corretorResponsavelId: 'cor-1',
    etapa: 1,
    nome: 'Teste',
    perfilBusca: {
      id: 'pb-test',
      leadId: 'lead-test',
      estado: 'SP',
      cidade: 'Ribeirão Preto',
      bairros: ['Jardim Sumaré'],
      raioKm: 5,
      tipos: ['apartamento'],
      valorDe: 400000,
      valorAte: 500000,
    },
    dataCadastro: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('avaliarTransicaoLead', () => {
  it('destino igual à origem é inválido', () => {
    const r = avaliarTransicaoLead(leadBase({ etapa: 2 }), 2)
    expect(r.tipo).toBe('invalida')
  })

  it('pular mais de uma etapa para frente é inválido', () => {
    const r = avaliarTransicaoLead(leadBase({ etapa: 1 }), 3)
    expect(r.tipo).toBe('invalida')
  })

  it('voltar uma etapa é reversão e exige confirmação, sem campo faltante', () => {
    const r = avaliarTransicaoLead(leadBase({ etapa: 3 }), 2)
    expect(r.tipo).toBe('reversao')
    expect(r.requerConfirmacao).toBe(true)
    expect(r.camposFaltantes).toEqual([])
  })

  describe('etapa 2 — Em contato: exige observações', () => {
    it('bloqueia sem observações', () => {
      const r = avaliarTransicaoLead(leadBase({ etapa: 1 }), 2)
      expect(r.tipo).toBe('avanco')
      expect(r.camposFaltantes).toEqual(['observacoes'])
    })

    it('libera com observações no lead', () => {
      const r = avaliarTransicaoLead(leadBase({ etapa: 1, observacoes: 'Ligou interessado' }), 2)
      expect(r.camposFaltantes).toEqual([])
    })

    it('libera com observações vindas só do patch (ainda não persistidas)', () => {
      const r = avaliarTransicaoLead(leadBase({ etapa: 1 }), 2, { observacoes: 'Anotado agora' })
      expect(r.camposFaltantes).toEqual([])
    })

    it('string vazia conta como faltando, não como preenchido', () => {
      const r = avaliarTransicaoLead(leadBase({ etapa: 1, observacoes: '' }), 2)
      expect(r.camposFaltantes).toEqual(['observacoes'])
    })
  })

  describe('etapa 3 — Visita agendada: exige ao menos uma visita', () => {
    it('bloqueia sem visitasAgendadas', () => {
      const r = avaliarTransicaoLead(leadBase({ etapa: 2 }), 3)
      expect(r.camposFaltantes).toEqual(['visitasAgendadas'])
    })

    it('bloqueia com array de visitas vazio (não é o mesmo que ausente, mas deve bloquear igual)', () => {
      const r = avaliarTransicaoLead(leadBase({ etapa: 2, visitasAgendadas: [] }), 3)
      expect(r.camposFaltantes).toEqual(['visitasAgendadas'])
    })

    it('libera com uma visita agendada', () => {
      const r = avaliarTransicaoLead(
        leadBase({ etapa: 2, visitasAgendadas: [{ imovelId: 'im-1', data: '2026-02-01' }] }),
        3,
      )
      expect(r.camposFaltantes).toEqual([])
    })

    // Regressão direta dos bugs #1/#2/#5 da rodada 08/09: o cadastro não pode ser
    // considerado válido para a etapa 3 sem essa qualificação, mesmo vindo por um
    // caminho diferente (patch do formulário de cadastro, não só edição via Kanban).
    it('patch com visita agendada libera mesmo que o lead persistido não tenha nenhuma', () => {
      const r = avaliarTransicaoLead(leadBase({ etapa: 2, visitasAgendadas: undefined }), 3, {
        visitasAgendadas: [{ imovelId: 'im-1', data: '2026-02-01' }],
      })
      expect(r.camposFaltantes).toEqual([])
    })
  })

  describe('etapa 4 — Em negociação: exige imóvel da negociação e confirmação', () => {
    it('bloqueia sem imovelNegociacaoId', () => {
      const r = avaliarTransicaoLead(leadBase({ etapa: 3 }), 4)
      expect(r.camposFaltantes).toEqual(['imovelNegociacaoId'])
      expect(r.requerConfirmacao).toBe(true)
    })

    it('libera com imovelNegociacaoId', () => {
      const r = avaliarTransicaoLead(leadBase({ etapa: 3, imovelNegociacaoId: 'im-1' }), 4)
      expect(r.camposFaltantes).toEqual([])
    })
  })

  describe('etapa 5 — Fechado: exige imóvel e valor negociado', () => {
    it('lista os dois campos quando ambos faltam', () => {
      const r = avaliarTransicaoLead(leadBase({ etapa: 4 }), 5)
      expect(r.camposFaltantes).toEqual(['imovelFechadoId', 'valorNegociado'])
    })

    it('valorNegociado igual a zero conta como preenchido (não é "faltando")', () => {
      const r = avaliarTransicaoLead(leadBase({ etapa: 4, imovelFechadoId: 'im-1', valorNegociado: 0 }), 5)
      expect(r.camposFaltantes).toEqual([])
    })

    it('libera com os dois campos preenchidos', () => {
      const r = avaliarTransicaoLead(
        leadBase({ etapa: 4, imovelFechadoId: 'im-1', valorNegociado: 450000 }),
        5,
      )
      expect(r.camposFaltantes).toEqual([])
    })
  })

  describe('etapa 6 — Pós-venda: exige pagamentos e chaves', () => {
    it('lista os dois campos quando ambos faltam', () => {
      const r = avaliarTransicaoLead(leadBase({ etapa: 5 }), 6)
      expect(r.camposFaltantes).toEqual(['pagamentosConcluidos', 'chavesEntregues'])
    })

    it('libera com os dois checkboxes marcados', () => {
      const r = avaliarTransicaoLead(
        leadBase({ etapa: 5, pagamentosConcluidos: true, chavesEntregues: true }),
        6,
      )
      expect(r.camposFaltantes).toEqual([])
    })
  })

  describe('etapas laterais — Standby e Perdido', () => {
    it('ir para standby (7) sempre exige motivo e confirmação, de qualquer etapa', () => {
      const r = avaliarTransicaoLead(leadBase({ etapa: 2 }), 7)
      expect(r.tipo).toBe('para_standby')
      expect(r.camposFaltantes).toEqual(['motivoStandby'])
      expect(r.requerConfirmacao).toBe(true)
    })

    it('ir para perdido (8) sempre exige motivo e confirmação, de qualquer etapa', () => {
      const r = avaliarTransicaoLead(leadBase({ etapa: 4 }), 8)
      expect(r.tipo).toBe('para_perdido')
      expect(r.camposFaltantes).toEqual(['motivoPerdido'])
    })

    it('reverter de standby para qualquer etapa é reversão sem campo faltante', () => {
      const r = avaliarTransicaoLead(leadBase({ etapa: 7 }), 3)
      expect(r.tipo).toBe('reversao')
      expect(r.camposFaltantes).toEqual([])
    })

    it('reverter de perdido para qualquer etapa é reversão sem campo faltante', () => {
      const r = avaliarTransicaoLead(leadBase({ etapa: 8 }), 1)
      expect(r.tipo).toBe('reversao')
    })
  })
})
