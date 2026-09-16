// Edge Function "matching" — calcula matches (imóveis x clientes) no
// servidor em vez de no navegador. Três modos, no corpo da requisição:
//
//   { tipo: 'contadores', pesos }                    (padrão se `tipo` vier ausente)
//   { tipo: 'matches-por-imovel', imovelId, pesos }   — leads compatíveis com um imóvel
//   { tipo: 'matches-por-lead', leadId, pesos }       — imóveis compatíveis com um lead
//
// Antes só os contadores (useMatches, badges "N clientes com perfil") rodavam
// aqui — os drill-downs (abrir a lista completa) ainda recalculavam no
// navegador com calcularMatch em loop (achado de revisão, 15/09/2026: parte
// do custo e da regra crítica continuava no cliente). Agora os três modos
// usam a mesma função, o mesmo cruzamento e o mesmo filtro de descarte —
// nenhuma lógica de match duplicada entre badge e drill-down.
//
// A lógica de score em si (domain/matching.ts) não foi duplicada — é
// importada por caminho relativo (Deno exige extensão .ts explícita nos
// imports locais; o arquivo é o mesmo usado pelo frontend e por
// matching.test.ts, sem cópia paralela pra não dessincronizar).
//
// Os modos de drill-down devolvem só os campos crus que a UI já usa pra
// montar o resumo e o nome do corretor (TIPO_IMOVEL_LABEL/formatPreco/
// nomeCorretor continuam client-side — são formatação de texto, não regra de
// negócio, e TIPO_IMOVEL_LABEL vem de um arquivo que importa ícones do
// lucide-react, sem razão nem como rodar no servidor).
//
// Autenticação: usa o JWT de quem chama, não a service role — as mesmas
// políticas de RLS (`equipe_le`) que valeriam se o cálculo ainda rodasse
// no navegador se aplicam aqui, sem privilégio extra.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { calcularMatch } from '../../../src/domain/matching.ts'
import { imovelParaDominio, leadParaDominio } from '../../../src/lib/supabaseMap.ts'
import type { Imovel, Lead, PesosScore } from '../../../src/domain/types.ts'

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

/** Campos crus de um lead que a UI precisa pra montar o resumo do match. */
function ladoLead(lead: Lead, score: number, isAviso: boolean) {
  return {
    leadId: lead.id,
    score,
    isAviso,
    tipos: lead.perfilBusca.tipos,
    bairros: lead.perfilBusca.bairros,
    valorAte: lead.perfilBusca.valorAte,
    corretorResponsavelId: lead.corretorResponsavelId,
  }
}

/** Campos crus de um imóvel que a UI precisa pra montar o resumo do match. */
function ladoImovel(imovel: Imovel, score: number, isAviso: boolean) {
  return {
    imovelId: imovel.id,
    score,
    isAviso,
    tipo: imovel.tipo,
    bairro: imovel.bairro,
    valorAnuncio: imovel.valorAnuncio,
    valorEstimado: imovel.valorEstimado,
    corretorResponsavelId: imovel.corretorResponsavelId,
  }
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
  const tipo = (corpo.tipo as string | undefined) ?? 'contadores'
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

    if (tipo === 'matches-por-imovel') {
      const imovelId = corpo.imovelId as string | undefined
      if (!imovelId) return resposta(400, { erro: 'imovelId é obrigatório' })
      const imovel = imoveis.find((i) => i.id === imovelId)
      if (!imovel) return resposta(404, { erro: 'Imóvel não encontrado' })

      const matches = leads
        .filter((lead) => naoDescartado(lead.id, imovelId))
        .map((lead) => {
          const match = calcularMatch(imovel, lead, pesos)
          return match ? ladoLead(lead, match.score, match.isAviso) : null
        })
        .filter((m): m is NonNullable<typeof m> => m != null)
        .sort((a, b) => b.score - a.score)

      return resposta(200, { matches })
    }

    if (tipo === 'matches-por-lead') {
      const leadId = corpo.leadId as string | undefined
      if (!leadId) return resposta(400, { erro: 'leadId é obrigatório' })
      const lead = leads.find((l) => l.id === leadId)
      if (!lead) return resposta(404, { erro: 'Cliente não encontrado' })

      const matches = imoveis
        .filter((imovel) => naoDescartado(leadId, imovel.id))
        .map((imovel) => {
          const match = calcularMatch(imovel, lead, pesos)
          return match ? ladoImovel(imovel, match.score, match.isAviso) : null
        })
        .filter((m): m is NonNullable<typeof m> => m != null)
        .sort((a, b) => b.score - a.score)

      return resposta(200, { matches })
    }

    // 'contadores' (padrão): badges de "N clientes/imóveis com perfil"
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
