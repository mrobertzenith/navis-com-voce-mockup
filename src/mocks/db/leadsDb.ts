import type { Lead } from '@/domain/types'
import { LEADS_SEED } from '@/mocks/data/leads'

const STORAGE_KEY = 'navis-mock-leads'

function carregar(): Lead[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return structuredClone(LEADS_SEED)
  try {
    return JSON.parse(raw) as Lead[]
  } catch {
    return structuredClone(LEADS_SEED)
  }
}

let leads: Lead[] = carregar()

function persistir() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads))
}

let seq = leads.length + 1
let ultimoCodigo = leads.reduce((max, l) => {
  const n = Number(l.codigo.replace('Lead #', ''))
  return Number.isFinite(n) ? Math.max(max, n) : max
}, 2400)

export const leadsDb = {
  getAll(): Lead[] {
    return leads
  },
  getById(id: string): Lead | undefined {
    return leads.find((l) => l.id === id)
  },
  create(dados: Omit<Lead, 'id' | 'codigo' | 'dataCadastro'>): Lead {
    ultimoCodigo += 1
    const novo: Lead = {
      ...dados,
      id: `lead-novo-${seq++}`,
      codigo: `Lead #${ultimoCodigo}`,
      dataCadastro: new Date().toISOString(),
    }
    leads = [...leads, novo]
    persistir()
    return novo
  },
  update(id: string, patch: Partial<Lead>): Lead | undefined {
    const idx = leads.findIndex((l) => l.id === id)
    if (idx === -1) return undefined
    leads[idx] = { ...leads[idx], ...patch }
    persistir()
    return leads[idx]
  },
}
