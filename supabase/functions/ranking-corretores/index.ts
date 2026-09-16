// Edge Function "ranking-corretores" — calcula o ranking (VGV, conversão,
// colaboração, score composto) no servidor, restrito a admin.
//
// Antes o cálculo rodava inteiro no navegador com dado já carregado no
// frontend (achado de revisão, 15/09/2026) — é tela gerencial, a regra de
// score devia estar centralizada num lugar só, e a checagem de admin era só
// de UI (RequireAdmin no roteador) — não impedia ler a API/RLS diretamente
// com outra conta. Aqui a checagem de papel é explícita, igual à função
// "equipe".
//
// domain/ranking.ts não foi duplicado — importado por caminho relativo
// (Deno exige extensão .ts explícita nos imports locais), mesmo padrão da
// função "matching".
//
// Autenticação: JWT de quem chama, não service role — só lê
// imoveis/negociacoes/corretores via RLS (`equipe_le`, já dava pra qualquer
// corretor da equipe antes disso), mas só devolve resposta pra quem tem
// papel admin na tabela `corretores`.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { calcularRanking, type CorretorParaRanking } from '../../../src/domain/ranking.ts'
import { imovelParaDominio, negociacaoParaDominio } from '../../../src/lib/supabaseMap.ts'

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

  const { data: eu } = await db
    .from('corretores')
    .select('papel')
    .eq('email', user.email.toLowerCase())
    .maybeSingle()
  if (eu?.papel !== 'admin') return resposta(403, { erro: 'Apenas administradores' })

  try {
    const [corretoresRes, imoveisRes, negociacoesRes] = await Promise.all([
      db.from('corretores').select('id, nome, cidade, estado'),
      db.from('imoveis').select('*'),
      db.from('negociacoes').select('*'),
    ])
    if (corretoresRes.error) {
      return resposta(500, { erro: `Falha ao carregar corretores: ${corretoresRes.error.message}` })
    }
    if (imoveisRes.error) return resposta(500, { erro: `Falha ao carregar imóveis: ${imoveisRes.error.message}` })
    if (negociacoesRes.error) {
      return resposta(500, { erro: `Falha ao carregar negociações: ${negociacoesRes.error.message}` })
    }

    const corretores: CorretorParaRanking[] = corretoresRes.data.map((row) => ({
      id: String(row.id),
      nome: String(row.nome),
      cidade: String(row.cidade ?? ''),
      estado: String(row.estado ?? ''),
    }))
    const imoveis = imoveisRes.data.map(imovelParaDominio)
    const negociacoes = negociacoesRes.data.map(negociacaoParaDominio)

    const ranking = calcularRanking(corretores, imoveis, negociacoes)
    return resposta(200, { ranking })
  } catch (e) {
    return resposta(500, { erro: e instanceof Error ? e.message : 'Erro interno' })
  }
})
