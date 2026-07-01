export function formatPreco(valor: number | undefined | null): string {
  if (valor == null) return '—'
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  })
}

export function formatM2(area: number | undefined | null): string {
  if (area == null) return '—'
  return `${area.toLocaleString('pt-BR')}m²`
}

export function formatData(iso: string | undefined | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

export function formatTelefone(telefone: string | undefined | null): string {
  if (!telefone) return '—'
  const digits = telefone.replace(/\D/g, '')
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return telefone
}

export function formatDiasDesde(iso: string | undefined | null): number {
  if (!iso) return 0
  const diffMs = Date.now() - new Date(iso).getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}
