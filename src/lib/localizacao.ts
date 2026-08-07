/**
 * Localização sem cerca geográfica: qualquer endereço do Brasil.
 * CEP consulta a base pública (BrasilAPI, com fallback ViaCEP) e,
 * quando disponível, traz coordenadas — usadas pelo matching por raio.
 */

export const UFS: { sigla: string; nome: string }[] = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
]

export interface EnderecoCep {
  estado: string
  cidade: string
  bairro: string
  rua: string
  lat?: number
  lng?: number
}

export async function buscarCep(cep: string): Promise<EnderecoCep | null> {
  const limpo = cep.replace(/\D/g, '')
  if (limpo.length !== 8) return null

  // BrasilAPI v2 — traz coordenadas quando disponíveis
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cep/v2/${limpo}`)
    if (r.ok) {
      const d = await r.json()
      const lat = Number(d.location?.coordinates?.latitude)
      const lng = Number(d.location?.coordinates?.longitude)
      return {
        estado: d.state ?? '',
        cidade: d.city ?? '',
        bairro: d.neighborhood ?? '',
        rua: d.street ?? '',
        lat: Number.isFinite(lat) ? lat : undefined,
        lng: Number.isFinite(lng) ? lng : undefined,
      }
    }
  } catch {
    /* tenta o fallback */
  }

  // ViaCEP — sem coordenadas
  try {
    const r = await fetch(`https://viacep.com.br/ws/${limpo}/json/`)
    if (r.ok) {
      const d = await r.json()
      if (!d.erro) {
        return {
          estado: d.uf ?? '',
          cidade: d.localidade ?? '',
          bairro: d.bairro ?? '',
          rua: d.logradouro ?? '',
        }
      }
    }
  } catch {
    /* offline ou CEP inexistente */
  }
  return null
}
