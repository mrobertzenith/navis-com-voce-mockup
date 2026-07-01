import { create } from 'zustand'
import { persist } from 'zustand/middleware'

function chave(corretorId: string, leadId: string, imovelId: string): string {
  return `${corretorId}::${leadId}::${imovelId}`
}

interface DismissState {
  descartados: Record<string, string>
  descartar: (corretorId: string, leadId: string, imovelId: string) => void
  estaDescartado: (corretorId: string, leadId: string, imovelId: string) => boolean
}

export const useDismissStore = create<DismissState>()(
  persist(
    (set, get) => ({
      descartados: {},
      descartar: (corretorId, leadId, imovelId) =>
        set((s) => ({
          descartados: { ...s.descartados, [chave(corretorId, leadId, imovelId)]: new Date().toISOString() },
        })),
      estaDescartado: (corretorId, leadId, imovelId) =>
        Boolean(get().descartados[chave(corretorId, leadId, imovelId)]),
    }),
    { name: 'navis-dismiss' },
  ),
)
