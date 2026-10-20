/**
 * Compartilhamento em lote de imóveis: o que vai pro cliente é só o LINK de
 * cada anúncio, um por linha — nunca o cadastro do imóvel (decisão de produto,
 * 20/10/2026). Imóvel sem link é ignorado e contado, pra a UI avisar.
 */
export interface ResultadoLinks {
  links: string[]
  semLink: number
}

export function reunirLinks(itens: Array<{ linkAnuncioUrl?: string | null }>): ResultadoLinks {
  const links: string[] = []
  let semLink = 0
  for (const item of itens) {
    const url = item.linkAnuncioUrl?.trim()
    if (url) {
      if (!links.includes(url)) links.push(url)
    } else {
      semLink++
    }
  }
  return { links, semLink }
}

export function textoDosLinks(links: string[]): string {
  return links.join('\n')
}

/** wa.me sem número abre o WhatsApp pra o corretor escolher a conversa. */
export function urlWhatsapp(links: string[]): string {
  return `https://wa.me/?text=${encodeURIComponent(textoDosLinks(links))}`
}
