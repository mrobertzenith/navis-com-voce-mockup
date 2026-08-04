/**
 * Carga dos dados de demonstração no Supabase.
 * Uso: npx vite-node scripts/seed.ts
 * Requer .env.local com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.
 *
 * Idempotente: usa UUIDs determinísticos (v5 dos ids do mock) + upsert,
 * então rodar duas vezes não duplica nada.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { CORRETORES, CORRETOR_LOGADO_ID } from '../src/mocks/data/corretores'
import { IMOVEIS_SEED } from '../src/mocks/data/imoveis'
import { LEADS_SEED } from '../src/mocks/data/clientes'
import { imovelParaRow, leadParaRow, perfilParaRow } from '../src/lib/supabaseMap'

// ---------- env ----------
function lerEnvLocal(): Record<string, string> {
  const out: Record<string, string> = {}
  try {
    for (const linha of readFileSync('.env.local', 'utf8').split('\n')) {
      const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/)
      if (m) out[m[1]] = m[2]
    }
  } catch {
    /* arquivo ausente — validado abaixo */
  }
  return out
}

const env = lerEnvLocal()
const url = env.VITE_SUPABASE_URL
const anonKey = env.VITE_SUPABASE_ANON_KEY
if (!url || !anonKey) {
  console.error('❌ Crie .env.local com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}
const supabase = createClient(url, anonKey)

// ---------- uuid determinístico (v5, mesmo algoritmo usado nos ids de corretor) ----------
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function uuidDeterministico(nome: string): string {
  if (UUID_RE.test(nome)) return nome // já é uuid (ex.: ids de corretor convertidos)
  const NS = Buffer.from('6ba7b8109dad11d180b400c04fd430c8', 'hex')
  const hash = createHash('sha1')
    .update(Buffer.concat([NS, Buffer.from('navis.local/' + nome)]))
    .digest()
  const b = Buffer.from(hash.subarray(0, 16))
  b[6] = (b[6] & 0x0f) | 0x50
  b[8] = (b[8] & 0x3f) | 0x80
  const h = b.toString('hex')
  return [h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20)].join('-')
}

async function main() {
  // ---------- corretores (Ana Silva = admin) ----------
  const rowsCorretores = CORRETORES.map((c) => ({
    id: c.id,
    papel: c.id === CORRETOR_LOGADO_ID ? 'admin' : 'corretor',
    nome: c.nome,
    creci: c.creci,
    cidade: c.cidade,
    estado: c.estado,
    email: c.email,
    telefone_whatsapp: c.telefoneWhatsapp,
    foto_url: c.fotoUrl ?? null,
    status: c.status,
    criado_em: c.criadoEm,
  }))
  const { error: errCorretores } = await supabase.from('corretores').upsert(rowsCorretores)
  if (errCorretores) throw new Error(`corretores: ${errCorretores.message}`)
  console.log(`✓ ${rowsCorretores.length} corretores (Ana Silva como admin)`)

  // ---------- imóveis ----------
  const rowsImoveis = IMOVEIS_SEED.map((i) => ({
    ...imovelParaRow(i),
    id: uuidDeterministico(i.id),
    fotos: i.fotos ?? [],
  }))
  const { error: errImoveis } = await supabase.from('imoveis').upsert(rowsImoveis)
  if (errImoveis) throw new Error(`imoveis: ${errImoveis.message}`)
  console.log(`✓ ${rowsImoveis.length} imóveis`)

  // ---------- leads + perfis de busca ----------
  const rowsLeads = LEADS_SEED.map((l) => {
    const row = leadParaRow(l)
    return {
      ...row,
      id: uuidDeterministico(l.id),
      visitas_agendadas: (l.visitasAgendadas ?? []).map((v) => ({
        ...v,
        imovelId: uuidDeterministico(v.imovelId),
      })),
      negociacoes_ativas: (l.negociacoesAtivas ?? []).map((n) => ({
        ...n,
        imovelId: uuidDeterministico(n.imovelId),
      })),
      pendente_aprovacao_imoveis: (l.pendenteAprovacaoImoveis ?? []).map(uuidDeterministico),
      imovel_fechado_id: l.imovelFechadoId ? uuidDeterministico(l.imovelFechadoId) : null,
    }
  })
  const { error: errLeads } = await supabase.from('leads').upsert(rowsLeads)
  if (errLeads) throw new Error(`leads: ${errLeads.message}`)

  const rowsPerfis = LEADS_SEED.map((l) => ({
    ...perfilParaRow(l.perfilBusca),
    id: uuidDeterministico(l.perfilBusca.id),
    lead_id: uuidDeterministico(l.id),
  }))
  const { error: errPerfis } = await supabase.from('perfis_busca').upsert(rowsPerfis)
  if (errPerfis) throw new Error(`perfis_busca: ${errPerfis.message}`)
  console.log(`✓ ${rowsLeads.length} leads + perfis de busca`)

  // ---------- conferência ----------
  for (const tabela of ['corretores', 'imoveis', 'leads', 'perfis_busca']) {
    const { count } = await supabase.from(tabela).select('*', { count: 'exact', head: true })
    console.log(`  ${tabela}: ${count} registros no banco`)
  }
  console.log('✅ Seed concluído')
}

main().catch((e) => {
  console.error('❌', e.message)
  process.exit(1)
})
