// Edge Function "link-preview" — devolve a imagem de capa (og:image) de um link
// de anúncio, pra o CRM mostrar a "ilustração do link" sem guardar foto nenhuma
// (decisão de produto: o sistema não armazena imagens de imóvel — só aponta pra
// a URL da imagem que o próprio site do anúncio já publica).
//
// Roda no servidor porque o navegador não consegue ler a página de outro site
// (CORS). Como busca uma URL escolhida pelo usuário, é um vetor clássico de SSRF
// (usar o servidor pra alcançar rede interna/metadados da nuvem), então:
//   - exige usuário logado e membro da equipe (mesma regra das outras funções);
//   - só https, só porta padrão, sem IP literal/localhost/domínios internos;
//   - resolve o DNS (via DNS-over-HTTPS) e recusa qualquer IP privado/loopback/
//     link-local/CGNAT/metadados — a cada redirecionamento, que é seguido na mão
//     (máx. 3) pra revalidar cada salto;
//   - timeout de 6s e lê no máximo ~400 KB do HTML (og:image fica no <head>);
//   - devolve só uma string de URL https — nunca o conteúdo da página.
//
// Corpo: { url: string }   Resposta: { imagem: string | null }

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function resposta(status: number, corpo: unknown) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

const MAX_BYTES = 400_000
const MAX_REDIRECTS = 3

function ipv4Privado(ip: string): boolean {
  const p = ip.split('.').map(Number)
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true
  const [a, b] = p
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local + metadados de nuvem
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multicast/reservado
  )
}

function ipv6Privado(ip: string): boolean {
  const s = ip.toLowerCase()
  if (s === '::' || s === '::1') return true
  if (s.startsWith('fc') || s.startsWith('fd')) return true // ULA
  if (s.startsWith('fe8') || s.startsWith('fe9') || s.startsWith('fea') || s.startsWith('feb')) return true
  const mapeado = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapeado) return ipv4Privado(mapeado[1])
  return false
}

async function resolver(host: string, tipo: 'A' | 'AAAA'): Promise<string[]> {
  const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${tipo}`, {
    headers: { accept: 'application/dns-json' },
    signal: AbortSignal.timeout(4000),
  })
  if (!r.ok) throw new Error('DNS indisponível')
  const j = await r.json()
  const alvo = tipo === 'A' ? 1 : 28
  return ((j.Answer ?? []) as Array<{ type: number; data: string }>)
    .filter((a) => a.type === alvo)
    .map((a) => a.data)
}

/** Lança erro se a URL não for segura de buscar. */
async function validarUrl(u: URL): Promise<void> {
  if (u.protocol !== 'https:') throw new Error('Só links https')
  if (u.port && u.port !== '443') throw new Error('Porta não permitida')
  if (u.username || u.password) throw new Error('Link com credenciais')
  const host = u.hostname.toLowerCase()
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    !host.includes('.') ||
    /^[\d.]+$/.test(host) ||
    host.includes(':') ||
    host.startsWith('[')
  ) {
    throw new Error('Endereço não permitido')
  }
  const [v4, v6] = await Promise.all([resolver(host, 'A'), resolver(host, 'AAAA')])
  const todos = [...v4, ...v6]
  if (todos.length === 0) throw new Error('Domínio não resolve')
  if (v4.some(ipv4Privado) || v6.some(ipv6Privado)) throw new Error('Endereço não permitido')
}

async function buscarHtml(inicial: URL): Promise<{ html: string; urlFinal: URL }> {
  let atual = inicial
  for (let salto = 0; salto <= MAX_REDIRECTS; salto++) {
    await validarUrl(atual)
    const r = await fetch(atual, {
      redirect: 'manual',
      signal: AbortSignal.timeout(6000),
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; NavisCRM-LinkPreview/1.0)',
        accept: 'text/html,application/xhtml+xml',
      },
    })
    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get('location')
      if (!loc) throw new Error('Redirecionamento inválido')
      atual = new URL(loc, atual)
      continue
    }
    if (!r.ok) throw new Error(`Site respondeu ${r.status}`)
    const tipo = r.headers.get('content-type') ?? ''
    if (!tipo.includes('html')) throw new Error('Não é uma página')
    const leitor = r.body!.getReader()
    const partes: Uint8Array[] = []
    let total = 0
    while (total < MAX_BYTES) {
      const { done, value } = await leitor.read()
      if (done || !value) break
      partes.push(value)
      total += value.length
    }
    await leitor.cancel().catch(() => {})
    const bytes = new Uint8Array(total)
    let off = 0
    for (const p of partes) {
      bytes.set(p, off)
      off += p.length
    }
    return { html: new TextDecoder('utf-8', { fatal: false }).decode(bytes), urlFinal: atual }
  }
  throw new Error('Redirecionamentos demais')
}

function atributo(tag: string, nome: string): string | undefined {
  const m = tag.match(new RegExp(`${nome}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))
  return m ? (m[2] ?? m[3] ?? m[4]) : undefined
}

function extrairImagem(html: string, base: URL): string | null {
  const cabeca = html.slice(0, MAX_BYTES)
  const candidatos: string[] = []
  for (const tag of cabeca.match(/<meta\b[^>]*>/gi) ?? []) {
    const chave = (atributo(tag, 'property') ?? atributo(tag, 'name') ?? '').toLowerCase()
    if (['og:image', 'og:image:url', 'og:image:secure_url', 'twitter:image', 'twitter:image:src'].includes(chave)) {
      const c = atributo(tag, 'content')
      if (c) candidatos.push(c)
    }
  }
  for (const tag of cabeca.match(/<link\b[^>]*>/gi) ?? []) {
    if ((atributo(tag, 'rel') ?? '').toLowerCase() === 'image_src') {
      const h = atributo(tag, 'href')
      if (h) candidatos.push(h)
    }
  }
  for (const bruto of candidatos) {
    try {
      const url = new URL(bruto.replaceAll('&amp;', '&'), base)
      if (url.protocol === 'http:') url.protocol = 'https:'
      if (url.protocol === 'https:') return url.toString()
    } catch {
      /* tenta o próximo */
    }
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const db = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  })

  const {
    data: { user },
  } = await db.auth.getUser(jwt)
  if (!user?.email) return resposta(401, { erro: 'Não autenticado' })
  const { data: eu } = await db.from('corretores').select('id').eq('email', user.email.toLowerCase()).maybeSingle()
  if (!eu) return resposta(403, { erro: 'Corretor não encontrado' })

  const corpo = await req.json().catch(() => ({}))
  let alvo: URL
  try {
    alvo = new URL(String(corpo.url ?? ''))
  } catch {
    return resposta(400, { erro: 'Link inválido' })
  }

  try {
    const { html, urlFinal } = await buscarHtml(alvo)
    return resposta(200, { imagem: extrairImagem(html, urlFinal) })
  } catch (e) {
    // falha de preview nunca é erro do app — a UI simplesmente não mostra imagem
    return resposta(200, { imagem: null, motivo: e instanceof Error ? e.message : 'falha' })
  }
})
