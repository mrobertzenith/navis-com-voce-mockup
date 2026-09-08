import { create } from 'zustand'

interface UIState {
  modalImovelId: string | null
  /** cliente de onde o imóvel foi aberto (drill-down de match) — pré-seleciona o vínculo */
  modalImovelContextoLeadId: string | null
  modalLeadId: string | null
  drillDownAberto: { tipo: 'imovel' | 'lead'; id: string } | null
  abrirModalImovel: (id: string, contextoLeadId?: string) => void
  abrirModalLead: (id: string) => void
  abrirDrillDown: (tipo: 'imovel' | 'lead', id: string) => void
  fecharModais: () => void
}

export const useUIStore = create<UIState>()((set) => ({
  modalImovelId: null,
  modalImovelContextoLeadId: null,
  modalLeadId: null,
  drillDownAberto: null,
  abrirModalImovel: (id, contextoLeadId) => set({ modalImovelId: id, modalImovelContextoLeadId: contextoLeadId ?? null }),
  abrirModalLead: (id) => set({ modalLeadId: id }),
  abrirDrillDown: (tipo, id) => set({ drillDownAberto: { tipo, id } }),
  fecharModais: () =>
    set({ modalImovelId: null, modalImovelContextoLeadId: null, modalLeadId: null, drillDownAberto: null }),
}))
