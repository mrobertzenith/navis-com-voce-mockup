import { readFileSync } from 'node:fs'

/**
 * Lê `.env.local` quando existe (dev local) e sempre deixa variáveis de
 * ambiente reais (CI) terem prioridade — assim os mesmos scripts rodam tanto
 * na máquina de quem desenvolve quanto no gate do GitHub Actions, sem
 * precisar de um arquivo .env.local lá (que nem existe em CI).
 */
export function env(): Record<string, string> {
  const out: Record<string, string> = {}
  try {
    for (const linha of readFileSync('.env.local', 'utf8').split('\n')) {
      const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/)
      if (m) out[m[1]] = m[2]
    }
  } catch {
    // sem .env.local (ex.: CI) — segue só com variáveis de ambiente
  }
  for (const [chave, valor] of Object.entries(process.env)) {
    if (valor) out[chave] = valor
  }
  return out
}
