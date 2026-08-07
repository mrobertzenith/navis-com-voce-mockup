/**
 * Limpeza da base de testes: remove os dados de demonstração (seed),
 * preservando tudo que foi criado pelos usuários reais.
 * Uso: npx vite-node scripts/limpar_dados_teste.ts [--executar]
 * Sem --executar, só audita e gera o backup.
 *
 * Identificação: o seed usa UUIDs determinísticos (v5 dos ids do mock);
 * dados criados pela interface têm UUID aleatório do banco → sobrevivem.
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { IMOVEIS_SEED } from '../src/mocks/data/imoveis'
import { LEADS_SEED } from '../src/mocks/data/clientes'
import { CORRETORES, CORRETOR_LOGADO_ID } from '../src/mocks/data/corretores'

const EXECUTAR = process.argv.includes('--executar')

function lerEnvLocal(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const linha of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/)
    if (m) out[m[1]] = m[2]
  }
  return out
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function uuidDeterministico(nome: string): string {
  if (UUID_RE.test(nome)) return nome
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
  const env = lerEnvLocal()
  const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
  const { error: erroLogin } = await supabase.auth.signInWithPassword({
    email: 'ana.silva@exemplo.com',
    password: 'NavisDemo2026x',
  })
  if (erroLogin) throw new Error('Login admin falhou: ' + erroLogin.message)

  // conjuntos de ids do seed
  const seedImoveis = new Set(IMOVEIS_SEED.map((i) => uuidDeterministico(i.id)))
  const seedLeads = new Set(LEADS_SEED.map((l) => uuidDeterministico(l.id)))
  // corretores fictícios = todos os do mock EXCETO a Ana (é o login admin em uso)
  const seedCorretores = new Set(CORRETORES.map((c) => c.id).filter((id) => id !== CORRETOR_LOGADO_ID))

  // estado atual
  const tabelas = [
    'corretores', 'imoveis', 'leads', 'perfis_busca', 'vinculos', 'negociacoes',
    'vendas', 'notificacoes', 'atividades', 'dismisses', 'interesses_posteriores',
    'imoveis_perdidos', 'preferencias_notificacao', 'pesos_score',
  ]
  const dump: Record<string, unknown[]> = {}
  for (const t of tabelas) {
    const { data, error } = await supabase.from(t).select('*')
    if (error) throw new Error(`${t}: ${error.message}`)
    dump[t] = data
  }

  // backup completo antes de qualquer coisa
  const arquivoBackup = `backup-pre-limpeza.local.json`
  writeFileSync(arquivoBackup, JSON.stringify(dump, null, 1))
  console.log(`📦 Backup completo salvo em ${arquivoBackup}`)

  const imoveis = dump.imoveis as { id: string; endereco_rua: string; corretor_responsavel_id: string }[]
  const leads = dump.leads as { id: string; nome: string }[]
  const corretores = dump.corretores as { id: string; nome: string; email: string }[]

  const imoveisSeed = imoveis.filter((i) => seedImoveis.has(i.id))
  const imoveisReais = imoveis.filter((i) => !seedImoveis.has(i.id))
  const leadsSeed = leads.filter((l) => seedLeads.has(l.id))
  const leadsReais = leads.filter((l) => !seedLeads.has(l.id))
  const corretoresSeed = corretores.filter((c) => seedCorretores.has(c.id))
  const corretoresReais = corretores.filter((c) => !seedCorretores.has(c.id))

  console.log('\n=== AUDITORIA ===')
  console.log(`imóveis:    ${imoveisSeed.length} de teste → APAGAR · ${imoveisReais.length} reais → manter`)
  imoveisReais.forEach((i) => console.log(`   mantém imóvel: ${i.endereco_rua}`))
  console.log(`clientes:   ${leadsSeed.length} de teste → APAGAR · ${leadsReais.length} reais → manter`)
  leadsReais.forEach((l) => console.log(`   mantém cliente: ${l.nome}`))
  console.log(`corretores: ${corretoresSeed.length} fictícios → APAGAR · ${corretoresReais.length} mantidos:`)
  corretoresReais.forEach((c) => console.log(`   mantém: ${c.nome} <${c.email}>`))
  for (const t of ['vinculos', 'negociacoes', 'vendas', 'notificacoes', 'atividades'] as const) {
    console.log(`${t}: ${dump[t].length} registros`)
  }

  if (!EXECUTAR) {
    console.log('\n(auditoria apenas — rode com --executar para apagar)')
    return
  }

  console.log('\n=== EXECUTANDO LIMPEZA ===')
  const apagar = async (tabela: string, ids: string[]) => {
    for (let i = 0; i < ids.length; i += 50) {
      const lote = ids.slice(i, i + 50)
      const { error } = await supabase.from(tabela).delete().in('id', lote)
      if (error) throw new Error(`${tabela}: ${error.message}`)
    }
    console.log(`✓ ${tabela}: ${ids.length} apagados`)
  }

  // ordem respeita as FKs: leads (perfis/vínculos caem em cascata) → imóveis → corretores
  await apagar('leads', leadsSeed.map((l) => l.id))
  await apagar('imoveis', imoveisSeed.map((i) => i.id))
  await apagar('corretores', corretoresSeed.map((c) => c.id))

  console.log('\n=== ESTADO FINAL ===')
  for (const t of ['corretores', 'imoveis', 'leads', 'perfis_busca'] as const) {
    const { count } = await supabase.from(t).select('*', { count: 'exact', head: true })
    console.log(`${t}: ${count} registros`)
  }
  console.log('✅ Limpeza concluída')
}

main().catch((e) => {
  console.error('❌', e.message)
  process.exit(1)
})
