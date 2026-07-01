import type { Atividade } from '@/domain/types'
import { CORRETOR_LOGADO_ID } from '@/mocks/data/corretores'

export const ATIVIDADES_SEED: Atividade[] = [
  {
    id: 'ativ-1',
    corretorId: CORRETOR_LOGADO_ID,
    descricao: 'Imóvel "Rua Amoipira, 120" publicado em Todos os Imóveis.',
    timestamp: '2026-06-30T14:20:00.000Z',
  },
  {
    id: 'ativ-2',
    corretorId: CORRETOR_LOGADO_ID,
    descricao: 'Cliente #2410 (Camila Duarte) moveu para "Visita agendada".',
    timestamp: '2026-06-29T11:05:00.000Z',
  },
  {
    id: 'ativ-3',
    corretorId: CORRETOR_LOGADO_ID,
    descricao: 'Imóvel "Rua Prudente de Moraes, 710" entrou em negociação.',
    timestamp: '2026-06-27T09:40:00.000Z',
  },
  {
    id: 'ativ-4',
    corretorId: CORRETOR_LOGADO_ID,
    descricao: 'Novo cliente cadastrado: Cliente #2401.',
    timestamp: '2026-06-25T16:15:00.000Z',
  },
  {
    id: 'ativ-5',
    corretorId: CORRETOR_LOGADO_ID,
    descricao: 'Imóvel "Rua Saldanha Marinho, 540" vendido por R$ 398.000.',
    timestamp: '2026-06-15T10:00:00.000Z',
  },
  {
    id: 'ativ-6',
    corretorId: CORRETOR_LOGADO_ID,
    descricao: 'Imóvel "Av. Costábile Romano, 1900" avançou para "Publicado".',
    timestamp: '2026-06-10T08:30:00.000Z',
  },
]
