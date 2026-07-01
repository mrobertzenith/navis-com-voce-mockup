import type { Imovel } from '@/domain/types'
import { IMOVEIS_SEED } from '@/mocks/data/imoveis'

const STORAGE_KEY = 'navis-mock-imoveis'

function carregar(): Imovel[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return structuredClone(IMOVEIS_SEED)
  try {
    return JSON.parse(raw) as Imovel[]
  } catch {
    return structuredClone(IMOVEIS_SEED)
  }
}

let imoveis: Imovel[] = carregar()

function persistir() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(imoveis))
}

let seq = imoveis.length + 1

export const imoveisDb = {
  getAll(): Imovel[] {
    return imoveis
  },
  getById(id: string): Imovel | undefined {
    return imoveis.find((i) => i.id === id)
  },
  cibJaExiste(cib: string): Imovel | undefined {
    return imoveis.find((i) => i.cib === cib)
  },
  create(dados: Omit<Imovel, 'id' | 'criadoEm' | 'atualizadoEm'>): Imovel {
    const agora = new Date().toISOString()
    const novo: Imovel = { ...dados, id: `im-novo-${seq++}`, criadoEm: agora, atualizadoEm: agora }
    imoveis = [...imoveis, novo]
    persistir()
    return novo
  },
  update(id: string, patch: Partial<Imovel>): Imovel | undefined {
    const idx = imoveis.findIndex((i) => i.id === id)
    if (idx === -1) return undefined
    imoveis[idx] = { ...imoveis[idx], ...patch, atualizadoEm: new Date().toISOString() }
    persistir()
    return imoveis[idx]
  },
}
