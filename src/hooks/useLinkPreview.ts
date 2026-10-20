import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const CHAVE_CACHE = 'navis-link-preview'
const VALIDADE_ACERTO_MS = 7 * 24 * 60 * 60 * 1000
const VALIDADE_FALHA_MS = 24 * 60 * 60 * 1000

type EntradaCache = { imagem: string | null; em: number }

function lerCache(): Record<string, EntradaCache> {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_CACHE) ?? '{}')
  } catch {
    return {}
  }
}

function gravarCache(url: string, imagem: string | null) {
  try {
    const atual = lerCache()
    atual[url] = { imagem, em: Date.now() }
    // limita o tamanho: guarda só as 300 entradas mais recentes
    const recentes = Object.entries(atual)
      .sort(([, a], [, b]) => b.em - a.em)
      .slice(0, 300)
    localStorage.setItem(CHAVE_CACHE, JSON.stringify(Object.fromEntries(recentes)))
  } catch {
    /* cache é só otimização — sem localStorage segue sem ele */
  }
}

/**
 * Imagem de capa (og:image) do link de anúncio, pra identificar o imóvel
 * visualmente sem guardar foto no sistema. Só guarda a URL da imagem (cache
 * local por 7 dias, pra uma lista de 20 imóveis não virar 20 chamadas a cada
 * abertura de tela) — a imagem em si continua hospedada no site do anúncio.
 * Sem Supabase (modo mock offline) não há função pra chamar: devolve null.
 */
export function useLinkPreview(url: string | undefined): string | null {
  const { data } = useQuery({
    queryKey: ['link-preview', url],
    enabled: Boolean(url) && Boolean(supabase),
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
    retry: false,
    queryFn: async (): Promise<string | null> => {
      const cache = lerCache()[url!]
      if (cache) {
        const validade = cache.imagem ? VALIDADE_ACERTO_MS : VALIDADE_FALHA_MS
        if (Date.now() - cache.em < validade) return cache.imagem
      }
      const { data: resp, error } = await supabase!.functions.invoke('link-preview', { body: { url } })
      const imagem = error ? null : ((resp?.imagem as string | null | undefined) ?? null)
      gravarCache(url!, imagem)
      return imagem
    },
  })
  return data ?? null
}
