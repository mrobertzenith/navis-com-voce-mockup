// Edge Function "matching" — calcula os contadores de match (imóveis x
// clientes) no servidor em vez de no navegador.
//
// Antes disso, useMatches() cruzava TODOS os imóveis com TODOS os leads no
// cliente (O(imóveis × leads)) a cada mudança de dado relevante, sem
// nenhuma persistência — recalculado do zero em cada corretor, a cada
// render (achado de auditoria, 14/09/2026). Aqui roda uma vez por chamada,
// filtrando já pelos pares que esse corretor descartou ("não interessou",
// tabela `dismisses`).
//
// A lógica de score em si (domain/matching.ts) não foi duplicada — é
// importada por caminho relativo (Deno exige extensão .ts explícita nos
// imports locais; o arquivo é o mesmo usado pelo frontend e por
// matching.test.ts, sem cópia paralela pra não dessincronizar).
//
// Autenticação: usa o JWT de quem chama, não a service role — as mesmas
// políticas de RLS (`equipe_le`) que valeriam se o cálculo ainda rodasse
// no navegador se aplicam aqui, sem privilégio extra.
//
// Corpo esperado: { pesos: PesosScore }
// Resposta: { contadorPorImovel: Record<string, number>, contadorPorLead: Record<string, number> }

import { createClient } from 'npm:@supabase/supabase-js@2'
import { calcularMatch } from '../../../src/domain/matching.ts'
import { imovelParaDominio, leadParaDominio } from '../../../src/lib/supabaseMap.ts'
import type { PesosScore } from '../../../src/domain/types.ts'

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

  // client autenticado como quem chamou — a mesma sessão que valeria no
  // navegador, então RLS decide o que ele pode ver (nada de service role
  // aqui: esta função só lê o que o próprio corretor já enxergaria)
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
    .select('id')
    .eq('email', user.email.toLowerCase())
    .maybeSingle()
  if (!eu) return resposta(403, { erro: 'Corretor não encontrado' })

  const corpo = await req.json().catch(() => ({}))
  const pesos = corpo.pesos as PesosScore | undefined
  if (!pesos) return resposta(400, { erro: 'pesos é obrigatório' })

  try {
    const [imoveisRes, leadsRes, dismissesRes] = await Promise.all([
      db.from('imoveis').select('*'),
      db.from('leads').select('*, perfis_busca(*)'),
      db.from('dismisses').select('lead_id, imovel_id').eq('corretor_id', eu.id),
    ])
    if (imoveisRes.error) return resposta(500, { erro: `Falha ao carregar imóveis: ${imoveisRes.error.message}` })
    if (leadsRes.error) return resposta(500, { erro: `Falha ao carregar leads: ${leadsRes.error.message}` })
    if (dismissesRes.error) {
      return resposta(500, { erro: `Falha ao carregar descartes: ${dismissesRes.error.message}` })
    }

    const imoveis = imoveisRes.data.map(imovelParaDominio).filter((i) => i.etapa !== 'f')
    const leads = leadsRes.data.map(leadParaDominio)
    const descartado = new Set(dismissesRes.data.map((d) => `${d.lead_id}::${d.imovel_id}`))
    const naoDescartado = (leadId: string, imovelId: string) => !descartado.has(`${leadId}::${imovelId}`)

    const contadorPorImovel: Record<string, number> = {}
    const contadorPorLead: Record<string, number> = {}

    for (const imovel of imoveis) {
      let count = 0
      for (const lead of leads) {
        if (naoDescartado(lead.id, imovel.id) && calcularMatch(imovel, lead, pesos)) count++
      }
      contadorPorImovel[imovel.id] = count
    }

    for (const lead of leads) {
      let count = 0
      for (const imovel of imoveis) {
        if (naoDescartado(lead.id, imovel.id) && calcularMatch(imovel, lead, pesos)) count++
      }
      contadorPorLead[lead.id] = count
    }

    return resposta(200, { contadorPorImovel, contadorPorLead })
  } catch (e) {
    return resposta(500, { erro: e instanceof Error ? e.message : 'Erro interno' })
  }
})
