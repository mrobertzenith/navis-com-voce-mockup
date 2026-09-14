/**
 * Carga dos dados de demonstração no Supabase.
 * Uso: npx vite-node scripts/seed.ts --confirmar
 *
 * Requer .env.local com VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (SEM
 * prefixo VITE_ de propósito — essa chave bypassa RLS inteiramente e NUNCA
 * pode ir pro bundle do frontend; o Vite só expõe variáveis VITE_*).
 *
 * Por que service role, e não a anon key de antes: desde a Fase 3 (RLS
 * restrita à equipe autenticada) e reforçado pela migração 15 (INSERT de
 * leads/imoveis/perfis_busca só pelo próprio dono), um client anônimo sem
 * nenhuma sessão não tem NENHUM acesso de escrita — o seed já falhava na
 * própria tabela `corretores` antes de chegar em imóveis/leads de vários
 * corretores diferentes. Como este script propositalmente cria dados EM
 * NOME de vários corretores de uma vez (não é uma sessão de um corretor só),
 * precisa mesmo do privilégio administrativo — só pode rodar fora do
 * navegador, nunca do frontend. Achado real, reportado por auditoria externa
 * (14/09/2026): ver CORRECOES_IMEDIATAS_CLAUDE.md.
 *
 * `--confirmar` é obrigatório de propósito: esta chave ignora toda regra de
 * permissão do banco — não é pra rodar sem querer contra o projeto errado.
 *
 * Idempotente SÓ enquanto o banco continuar igual ao que este script gerou —
 * é um bootstrap de ambiente novo (Fase 2), não uma sincronização contínua.
 * Confirmado na prática (14/09/2026): corretores/imóveis re-rodam de boa
 * (upsert por id determinístico, sem duplicar), mas `leads`/`perfis_busca`
 * já NÃO rodam mais contra o banco de produção atual — os leads originais
 * da seed foram substituídos, ao longo dos testes reais, por clientes de
 * verdade que reaproveitaram por coincidência os MESMOS códigos
 * ("Cliente #2401", #2402...) com IDs diferentes (gerados pelo banco, não
 * determinísticos). Isso faz o upsert de leads esbarrar na constraint
 * única de `codigo` — não é bug de RLS, é o script de bootstrap batendo de
 * frente com dado real que já existe. Não force isso (não troque pra
 * `ON CONFLICT (codigo) DO NOTHING` ou similar): arriscaria mascarar ou
 * sobrescrever cliente real sem ninguém perceber. Se precisar recriar o
 * dataset de demonstração, use um projeto Supabase novo/vazio.
 */
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { CORRETORES, CORRETOR_LOGADO_ID } from '../src/mocks/data/corretores'
import { IMOVEIS_SEED } from '../src/mocks/data/imoveis'
import { LEADS_SEED } from '../src/mocks/data/clientes'
import { imovelParaRow, leadParaRow, perfilParaRow } from '../src/lib/supabaseMap'
import { env } from './lib/env'

const CONFIRMAR = process.argv.includes('--confirmar')
if (!CONFIRMAR) {
  console.error(
    '⚠️  Este script usa SUPABASE_SERVICE_ROLE_KEY (bypassa toda RLS) pra popular dados de\n' +
      '   demonstração em nome de vários corretores de uma vez. Rode de novo com --confirmar\n' +
      '   quando tiver certeza de qual banco está apontando (npx vite-node scripts/seed.ts --confirmar).',
  )
  process.exit(1)
}

const e = env()
const url = e.VITE_SUPABASE_URL
const serviceRoleKey = e.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceRoleKey) {
  console.error(
    '❌ Faltam VITE_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no .env.local.\n' +
      '   A service role key fica em Supabase → Project Settings → API → service_role\n' +
      '   (secret) — NUNCA prefixar com VITE_, senão o Vite embute ela no bundle do frontend.',
  )
  process.exit(1)
}
// sem sessão de usuário pra gerenciar — é uma chamada administrativa direta
const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

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
