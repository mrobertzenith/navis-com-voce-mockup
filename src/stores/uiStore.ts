import { create } from 'zustand'

interface UIState {
  modalImovelId: string | null
  modalLeadId: string | null
  drillDownAberto: { tipo: 'imovel' | 'lead'; id: string } | null
  abrirModalImovel: (id: string) => void
  abrirModalLead: (id: string) => void
  abrirDrillDown: (tipo: 'imovel' | 'lead', id: string) => void
  fecharModais: () => void
}

export const useUIStore = create<UIState>()((set) => ({
  modalImovelId: null,
  modalLeadId: null,
  drillDownAberto: null,
  abrirModalImovel: (id) => set({ modalImovelId: id }),
  abrirModalLead: (id) => set({ modalLeadId: id }),
  abrirDrillDown: (tipo, id) => set({ drillDownAberto: { tipo, id } }),
  fecharModais: () => set({ modalImovelId: null, modalLeadId: null, drillDownAberto: null }),
}))
