import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ModalGateCliente } from '@/components/lead/ModalGateCliente'
import type { Imovel, Lead } from '@/domain/types'

// Regressão da RODADA 03: "um imóvel não pode estar em mais de uma negociação
// ativa" — antes disso, um cliente conseguia avançar pra visita/negociação
// com um imóvel que outro cliente já tinha em negociacoesAtivas.

function imovelBase(overrides: Partial<Imovel> = {}): Imovel {
  return {
    id: 'im-1',
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

function leadBase(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead-b',
    codigo: 'Cliente #B',
    corretorResponsavelId: 'cor-1',
    etapa: 3,
    nome: 'Cliente B',
    perfilBusca: {
      id: 'pb-b',
      leadId: 'lead-b',
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

const imovelDisputado = imovelBase({ id: 'im-disputado' })
const imovelLivre = imovelBase({ id: 'im-livre', enderecoRua: 'Rua Livre' })

const leadAComImovelPreso = leadBase({
  id: 'lead-a',
  codigo: 'Cliente #A',
  etapa: 4,
  negociacoesAtivas: [{ imovelId: 'im-disputado', dataInicio: '2026-01-05T00:00:00.000Z' }],
})

vi.mock('@/hooks/useImoveis', () => ({
  useImoveis: () => ({ data: [imovelDisputado, imovelLivre] }),
}))
vi.mock('@/hooks/useLeads', () => ({
  useLeads: () => ({ data: [leadAComImovelPreso, leadBase()] }),
}))

describe('ModalGateCliente — um imóvel não pode estar em mais de uma negociação', () => {
  it('exclui da lista de "Em negociação" um imóvel já preso a outro cliente, mas mantém os livres', async () => {
    render(
      <ModalGateCliente
        lead={leadBase()}
        destino={4}
        camposFaltantes={['imovelNegociacaoId']}
        requerConfirmacao
        onCancelar={() => {}}
        onConfirmar={() => {}}
      />,
    )

    expect(screen.queryByText(/Rua Teste/)).not.toBeInTheDocument()
    expect(await screen.findByText(/Rua Livre/)).toBeInTheDocument()
  })

  it('exclui da lista de "Visita agendada" um imóvel já preso a outro cliente, mas mantém os livres', async () => {
    render(
      <ModalGateCliente
        lead={leadBase()}
        destino={3}
        camposFaltantes={['visitasAgendadas']}
        requerConfirmacao={false}
        onCancelar={() => {}}
        onConfirmar={() => {}}
      />,
    )

    expect(screen.queryByText(/Rua Teste/)).not.toBeInTheDocument()
    expect(await screen.findByText(/Rua Livre/)).toBeInTheDocument()
    // a opção de imóvel fora da base continua disponível independentemente
    expect(screen.getByText('Imóvel fora da base')).toBeInTheDocument()
  })
})
