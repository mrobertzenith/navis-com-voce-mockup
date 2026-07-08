import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Notificacao } from '@/domain/types'
import { NOTIFICACOES_SEED } from '@/mocks/data/notificacoes'

interface NotificacoesState {
  notificacoes: Notificacao[]
  marcarComoLida: (id: string) => void
  marcarComoNaoLida: (id: string) => void
  adicionarNotificacao: (notificacao: Omit<Notificacao, 'id' | 'lida' | 'criadaEm'>) => void
}

export const useNotificacoesStore = create<NotificacoesState>()(
  persist(
    (set) => ({
      notificacoes: NOTIFICACOES_SEED,
      marcarComoLida: (id) =>
        set((s) => ({
          notificacoes: s.notificacoes.map((n) => (n.id === id ? { ...n, lida: true } : n)),
        })),
      marcarComoNaoLida: (id) =>
        set((s) => ({
          notificacoes: s.notificacoes.map((n) => (n.id === id ? { ...n, lida: false } : n)),
        })),
      adicionarNotificacao: (notificacao) =>
        set((s) => ({
          notificacoes: [
            {
              ...notificacao,
              id: `not-${Date.now()}-${Math.round(Math.random() * 1000)}`,
              lida: false,
              criadaEm: new Date().toISOString(),
            },
            ...s.notificacoes,
          ],
        })),
    }),
    { name: 'navis-notificacoes' },
  ),
)
