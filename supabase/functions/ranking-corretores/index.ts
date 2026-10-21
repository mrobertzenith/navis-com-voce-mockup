// Edge Function "ranking-corretores" — ranking de VGV executado por período,
// calculado no servidor.
//
// Duas visões, decididas aqui (não no cliente):
//   - qualquer corretor da equipe: vendas e VGV por corretor (ranking público);
//   - admin: além disso conversão, colaboração e score composto (gerencial).
// A visão pública não devolve os campos gerenciais nem pra quem chamar a API
// direto — o corte é no servidor, não só na tela.
//
// Corpo: { periodo: { tipo: 'mes'|'trimestre'|'semestre'|'ano'|'tudo', ano, indice } }
// Resposta: { ranking: LinhaRanking[], visao: 'publica' | 'admin' }
//
// domain/ranking.ts não foi duplicado — importado por caminho relativo (Deno
// exige extensão .ts explícita nos imports locais), mesmo padrão de "matching".
//
// Autenticação: JWT de quem chama, não service role — só lê
// corretores/vendas/negociacoes via RLS (`equipe_le`, já dava pra qualquer
// corretor da equipe antes disso).

import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  calcularRanking,
  limitesDoPeriodo,
  paraVisaoPublica,
  periodoValido,
  type CorretorParaRanking,
  type VendaParaRanking,
} from '../../../src/domain/ranking.ts'
import { negociacaoParaDominio } from '../../../src/lib/supabaseMap.ts'

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
    .select('papel, status')
    .eq('email', user.email.toLowerCase())
    .maybeSingle()
  if (!eu || eu.status === 'suspenso') return resposta(403, { erro: 'Sem acesso' })
  const admin = eu.papel === 'admin'

  const corpo = await req.json().catch(() => ({}))
  if (!periodoValido(corpo.periodo)) return resposta(400, { erro: 'Período inválido' })
  const limites = limitesDoPeriodo(corpo.periodo)

  try {
    const [corretoresRes, vendasRes, negociacoesRes] = await Promise.all([
      db.from('corretores').select('id, nome, cidade, estado, status'),
      db.from('vendas').select('corretor_imovel_id, valor_venda, data_venda, revertida'),
      admin ? db.from('negociacoes').select('*') : Promise.resolve({ data: [], error: null }),
    ])
    if (corretoresRes.error) {
      return resposta(500, { erro: `Falha ao carregar corretores: ${corretoresRes.error.message}` })
    }
    if (vendasRes.error) return resposta(500, { erro: `Falha ao carregar vendas: ${vendasRes.error.message}` })
    if (negociacoesRes.error) {
      return resposta(500, { erro: `Falha ao carregar negociações: ${negociacoesRes.error.message}` })
    }

    const corretores: CorretorParaRanking[] = corretoresRes.data
      .filter((row) => row.status !== 'suspenso')
      .map((row) => ({
        id: String(row.id),
        nome: String(row.nome),
        cidade: String(row.cidade ?? ''),
        estado: String(row.estado ?? ''),
      }))
    const vendas: VendaParaRanking[] = vendasRes.data.map((row) => ({
      corretorImovelId: String(row.corretor_imovel_id),
      valorVenda: Number(row.valor_venda),
      dataVenda: String(row.data_venda),
      revertida: Boolean(row.revertida),
    }))
    const negociacoes = negociacoesRes.data.map(negociacaoParaDominio)

    const completo = calcularRanking(corretores, vendas, negociacoes, limites)
    return resposta(200, {
      ranking: admin ? completo : paraVisaoPublica(completo),
      visao: admin ? 'admin' : 'publica',
    })
  } catch (e) {
    return resposta(500, { erro: e instanceof Error ? e.message : 'Erro interno' })
  }
})
