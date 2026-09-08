/**
 * Comparação de nomes de lugar digitados livremente.
 *
 * Com endereço livre (sem lista fixa), o mesmo bairro chega escrito de formas
 * diferentes: "Jardim Botânico", "Jd. Botanico", "jd botanico", "Olhos d'Água",
 * "Olhos dagua". Todas precisam ser reconhecidas como o mesmo lugar, senão o
 * corretor perde matches por causa de um ponto ou acento.
 */

/** Abreviações usuais em endereços brasileiros → forma por extenso */
const ABREVIACOES: Record<string, string> = {
  jd: 'jardim',
  jardins: 'jardim',
  vl: 'vila',
  pq: 'parque',
  res: 'residencial',
  resid: 'residencial',
  cj: 'conjunto',
  cjto: 'conjunto',
  cond: 'condominio',
  st: 'setor',
  nsa: 'nossa',
  sra: 'senhora',
  sto: 'santo',
  sta: 'santa',
  pres: 'presidente',
  eng: 'engenheiro',
  prof: 'professor',
  dr: 'doutor',
  av: 'avenida',
  r: 'rua',
  pca: 'praca',
  cha: 'chacara',
  chac: 'chacara',
  distr: 'distrito',
  nucl: 'nucleo',
}

/** Palavras de ligação que não distinguem um bairro de outro */
const LIGACOES = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])

/**
 * Reduz um nome de bairro/cidade à sua forma comparável: sem acentos, sem
 * pontuação, com abreviações expandidas e sem palavras de ligação.
 *
 * "Jd. Botânico" · "jardim botanico" · "JARDIM BOTÂNICO" → "botanico jardim"
 * "Olhos d'Água" · "Olhos Dagua" · "Olhos d Agua" → "dagua olhos"
 * "Jardim das Flores" · "Jardim Flores" → "flores jardim"
 *
 * A ordem das palavras é normalizada (alfabética) para que "Jardim Botânico"
 * e "Botânico, Jardim" também se encontrem.
 */
export function normalizarLocal(valor: string): string {
  const semAcento = valor
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

  // apóstrofo some sem deixar espaço ("d'agua" → "dagua"); demais separadores viram espaço
  const semPontuacao = semAcento.replace(/['’`]/g, '').replace(/[^a-z0-9]+/g, ' ')

  const bruto = semPontuacao.split(' ').filter(Boolean)

  // "d" solto gruda na palavra seguinte, para "d Agua" convergir com "d'Água" e "dagua"
  const unidas: string[] = []
  for (let i = 0; i < bruto.length; i++) {
    if (bruto[i] === 'd' && i + 1 < bruto.length) {
      unidas.push('d' + bruto[i + 1])
      i++
    } else {
      unidas.push(bruto[i])
    }
  }

  const palavras = unidas.map((p) => ABREVIACOES[p] ?? p).filter((p) => !LIGACOES.has(p))

  return palavras.sort().join(' ')
}

/** Dois nomes de lugar se referem ao mesmo lugar? */
export function mesmoLocal(a: string, b: string): boolean {
  return normalizarLocal(a) === normalizarLocal(b)
}

/** Já existe um nome equivalente na lista? Devolve o existente (para evitar duplicatas) */
export function encontrarEquivalente(valor: string, lista: string[]): string | undefined {
  const alvo = normalizarLocal(valor)
  return lista.find((item) => normalizarLocal(item) === alvo)
}
