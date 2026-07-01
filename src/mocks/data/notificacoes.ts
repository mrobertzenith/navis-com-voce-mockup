import type { Notificacao } from '@/domain/types'
import { CORRETOR_LOGADO_ID } from '@/mocks/data/corretores'

export const NOTIFICACOES_SEED: Notificacao[] = [
  {
    id: 'not-1',
    destinatarioCorretorId: CORRETOR_LOGADO_ID,
    tipoEvento: 'E12',
    titulo: 'Acompanhamento de visita',
    corpo: 'A visita do Lead #2409 (Camila Duarte) foi realizada? O cliente gostou do imóvel?',
    lida: false,
    criadaEm: '2026-07-01T09:00:00.000Z',
  },
  {
    id: 'not-2',
    destinatarioCorretorId: CORRETOR_LOGADO_ID,
    tipoEvento: 'E4',
    titulo: 'Novo imóvel disponível',
    corpo: 'Há um novo imóvel publicado que combina com o perfil de um dos seus clientes.',
    lida: false,
    criadaEm: '2026-06-30T15:20:00.000Z',
  },
  {
    id: 'not-3',
    destinatarioCorretorId: CORRETOR_LOGADO_ID,
    tipoEvento: 'E2',
    titulo: 'Matching inicial',
    corpo: 'Há clientes que podem se interessar pelo imóvel que você cadastrou em Rua Amoreira, 210.',
    lida: true,
    criadaEm: '2026-06-28T11:00:00.000Z',
  },
  {
    id: 'not-4',
    destinatarioCorretorId: CORRETOR_LOGADO_ID,
    tipoEvento: 'E16',
    titulo: 'Validação pendente',
    corpo: 'A negociação do imóvel em Ribeirânia está aguardando confirmação há mais de 48h.',
    lida: true,
    criadaEm: '2026-06-25T08:30:00.000Z',
  },
]
