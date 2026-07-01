import { create } from 'zustand'

interface DemoState {
  resetSignal: number
  resetarDemo: () => void
}

/**
 * resetSignal é incrementado no reset; stores de dados observam esse valor
 * (via localStorage.clear + reload) para voltar aos dados default.
 */
export const useDemoStore = create<DemoState>()((set) => ({
  resetSignal: 0,
  resetarDemo: () => {
    localStorage.clear()
    set((s) => ({ resetSignal: s.resetSignal + 1 }))
    window.location.reload()
  },
}))
