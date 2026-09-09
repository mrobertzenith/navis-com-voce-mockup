/**
 * Teste de fluxos com DOIS corretores logados ao mesmo tempo — a única forma
 * real de verificar comportamento cross-corretor (notificações, vínculos,
 * visibilidade, permissões). Até esta suíte existir, nenhum teste (manual ou
 * automatizado) jamais rodou com duas sessões reais simultâneas — foi assim
 * que o sistema de notificações inteiro ficou local-only sem que ninguém
 * percebesse. Ver ESTRATEGIA_QA.md §1.3 e §2, camada 5.
 *
 * Uso: npx vite-node scripts/teste-fluxos-cross-corretor.ts
 *
 * Corretor A: ana.silva@exemplo.com (admin, já usado em teste-fluxos.ts).
 * Corretor B: fixture "zzteste-fluxo-b@navisteste.local" — conta real, criada
 * uma única vez via a função "equipe" (criar_direto) e reaproveitada entre
 * execuções (a Edge Function só permite excluir convite nunca usado, e essa
 * conta já fez login — por isso não é recriada/apagada a cada rodada; ver
 * comentário em .env.local). Não é dado de corretor real da equipe.
 */
import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { imovelParaRow, leadParaRow } from '../src/lib/supabaseMap'
import type { Imovel } from '../src/domain/types'
import { env } from './lib/env'

const MARCADOR = 'ZZTESTE-CROSS'

const e = env()

let passou = 0
let falhou = 0
const falhas: string[] = []

async function checar(nome: string, fn: () => Promise<void>) {
  try {
    await fn()
    console.log(`  ✅ ${nome}`)
    passou++
  } catch (erro) {
    const msg = erro instanceof Error ? erro.message : String(erro)
    console.log(`  ❌ ${nome}\n       ${msg}`)
    falhas.push(`${nome}: ${msg}`)
    falhou++
  }
}

function exigir(condicao: unknown, mensagem: string) {
  if (!condicao) throw new Error(mensagem)
}

async function login(email: string, password: string): Promise<{ client: SupabaseClient; corretorId: string }> {
  const client = createClient(e.VITE_SUPABASE_URL, e.VITE_SUPABASE_ANON_KEY)
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`login de ${email} falhou: ${error.message}`)
  const { data } = await client.from('corretores').select('id').eq('email', email).single()
  return { client, corretorId: data!.id as string }
}

async function main() {
  console.log('\n=== TESTE DE FLUXOS CROSS-CORRETOR — NAVIS COM VOCÊ ===\n')

  if (!e.TESTE_FLUXO_CORRETOR_B_EMAIL || !e.TESTE_FLUXO_CORRETOR_B_SENHA) {
    throw new Error(
      'Faltam TESTE_FLUXO_CORRETOR_B_EMAIL/SENHA no .env.local — ver comentário em ESTRATEGIA_QA.md sobre ' +
        'como criar o fixture do corretor B via a função "equipe" (acao: criar_direto).',
    )
  }

  const a = await login(e.ADMIN_EMAIL ?? 'ana.silva@exemplo.com', e.ADMIN_SENHA ?? 'NavisDemo2026x')
  const b = await login(e.TESTE_FLUXO_CORRETOR_B_EMAIL, e.TESTE_FLUXO_CORRETOR_B_SENHA)
  console.log(`Corretor A (admin): ${a.corretorId}`)
  console.log(`Corretor B (comum): ${b.corretorId}\n`)

  let imovelDeAId = ''
  const notificacoesTeste: string[] = []
  const vinculosTeste: string[] = []

  // ---------- VISIBILIDADE ----------
  console.log('VISIBILIDADE (RLS é por equipe — a fronteira real é o filtro do app)')

  await checar('A cadastra um imóvel', async () => {
    const imovel: Omit<Imovel, 'id' | 'criadoEm' | 'atualizadoEm'> = {
      corretorResponsavelId: a.corretorId,
      etapa: 'a',
      enderecoRua: MARCADOR,
      enderecoNumero: '1',
      bairro: 'Centro',
      cidade: 'Ribeirão Preto',
      estado: 'SP',
      cep: '',
      lat: 0,
      lng: 0,
      tipo: 'apartamento',
      quartos: 2,
      suites: 0,
      vagas: 1,
      banheiros: 1,
      emNegociacaoFlag: false,
    }
    const { data, error } = await a.client.from('imoveis').insert(imovelParaRow(imovel)).select().single()
    exigir(!error, error?.message ?? '')
    imovelDeAId = data!.id
  })

  await checar('B consegue ler o imóvel de A direto no banco (RLS libera pra equipe toda — é o modelo documentado)', async () => {
    const { data, error } = await b.client.from('imoveis').select('id').eq('id', imovelDeAId).maybeSingle()
    exigir(!error, error?.message ?? '')
    exigir(data != null, 'B deveria conseguir ler o imóvel de A (RLS por equipe, não por dono)')
  })

  await checar('o filtro "meus imóveis" do app (client-side) exclui o imóvel de A da lista de B', async () => {
    const { data, error } = await b.client.from('imoveis').select('id, corretor_responsavel_id')
    exigir(!error, error?.message ?? '')
    // mesma lógica usada nas telas "Meus Imóveis": i.corretorResponsavelId === CORRETOR_LOGADO_ID
    const meusDeB = (data ?? []).filter((i) => i.corretor_responsavel_id === b.corretorId)
    exigir(
      !meusDeB.some((i) => i.id === imovelDeAId),
      'o imóvel de A vazou para dentro do filtro "meus imóveis" de B',
    )
  })

  // ---------- NOTIFICAÇÕES CROSS-CORRETOR ----------
  console.log('\nNOTIFICAÇÕES (100% local até esta sessão — agora precisa realmente atravessar contas)')

  await checar('A cria uma notificação real para B (mesmo payload que useCriarNotificacao manda)', async () => {
    // gera o id no cliente: depois da RLS de notificações restringir SELECT
    // só ao destinatário (migração 9), A não consegue mais reler de volta a
    // notificação que ela mesma criou pra B — o próprio Postgres recusa um
    // INSERT ... RETURNING quando a linha resultante não passa na política de
    // SELECT de quem inseriu. É o comportamento certo (o app real nunca usa
    // .select() nesse insert, só este script usava, pra saber o id a apagar).
    const id = randomUUID()
    const { error } = await a.client.from('notificacoes').insert({
      id,
      destinatario_corretor_id: b.corretorId,
      tipo_evento: 'E16',
      titulo: MARCADOR,
      corpo: 'teste cross-corretor',
      acao_pendente: null,
    })
    exigir(!error, error?.message ?? '')
    notificacoesTeste.push(id)
  })

  await checar('B enxerga a notificação usando a MESMA query do app (fetchNotificacoes)', async () => {
    const { data, error } = await b.client
      .from('notificacoes')
      .select('*')
      .eq('destinatario_corretor_id', b.corretorId)
      .order('criada_em', { ascending: false })
    exigir(!error, error?.message ?? '')
    exigir(
      (data ?? []).some((n) => n.titulo === MARCADOR),
      'B deveria ver a notificação endereçada a ele usando a query real do app',
    )
  })

  await checar('A NÃO vê essa notificação na própria caixa (a query do app não vaza inbox de terceiro)', async () => {
    const { data, error } = await a.client
      .from('notificacoes')
      .select('*')
      .eq('destinatario_corretor_id', a.corretorId)
      .order('criada_em', { ascending: false })
    exigir(!error, error?.message ?? '')
    exigir(
      !(data ?? []).some((n) => n.titulo === MARCADOR),
      'a notificação endereçada a B apareceu na caixa de A',
    )
  })

  // ---------- VÍNCULO CROSS-CORRETOR ----------
  console.log('\nVÍNCULO (imóvel de um corretor vinculado ao cliente de outro)')

  let leadDeAId = ''
  await checar('A cadastra um cliente', async () => {
    const { data, error } = await a.client
      .from('leads')
      .insert({
        ...leadParaRow({ corretorResponsavelId: a.corretorId, etapa: 1, nome: MARCADOR }),
        codigo: `${MARCADOR}-${Date.now()}`,
      })
      .select()
      .single()
    exigir(!error, error?.message ?? '')
    leadDeAId = data!.id
  })

  await checar('A vincula o cliente dela ao imóvel dela mesma (caminho normal) — confirma a escrita', async () => {
    const { data, error } = await a.client
      .from('vinculos')
      .insert({ imovel_id: imovelDeAId, lead_id: leadDeAId, origem: 'manual_corretor' })
      .select()
      .single()
    exigir(!error, error?.message ?? '')
    vinculosTeste.push(data!.id as string)
  })

  await checar('B consegue vincular o PRÓPRIO cliente a um imóvel de A (escrita cross-corretor real, não mockada)', async () => {
    const { data: leadDeB, error: erroLead } = await b.client
      .from('leads')
      .insert({
        ...leadParaRow({ corretorResponsavelId: b.corretorId, etapa: 1, nome: `${MARCADOR}-B` }),
        codigo: `${MARCADOR}-B-${Date.now()}`,
      })
      .select()
      .single()
    exigir(!erroLead, erroLead?.message ?? '')

    const { data: vinculo, error } = await b.client
      .from('vinculos')
      .insert({ imovel_id: imovelDeAId, lead_id: leadDeB!.id, origem: 'manual_corretor' })
      .select()
      .single()
    exigir(!error, error?.message ?? '')
    vinculosTeste.push(vinculo!.id as string)

    await a.client.from('leads').delete().eq('id', leadDeB!.id)
  })

  // ---------- PERMISSÕES GRANULARES (migração 11) ----------
  // Decisão do PO 09/09/2026: contato/observações NUNCA cruzam (nem com
  // vínculo), escrita cruza só etapa/flags de funil nos dois sentidos
  // quando existe negociação real ligando os dois lados, valor de venda só
  // o dono do imóvel altera. Ver PLANO_ARQUITETURA_NEGOCIACOES_E_RLS.md §B.6-B.9.
  console.log('\nPERMISSÕES GRANULARES (RLS + trigger de leads/imoveis/negociacoes — migração 11)')

  let imovelDeBId = ''
  let negociacaoVinculoId = ''

  await checar('B cadastra um imóvel', async () => {
    const imovel: Omit<Imovel, 'id' | 'criadoEm' | 'atualizadoEm'> = {
      corretorResponsavelId: b.corretorId,
      etapa: 'a',
      enderecoRua: MARCADOR,
      enderecoNumero: '2',
      bairro: 'Centro',
      cidade: 'Ribeirão Preto',
      estado: 'SP',
      cep: '',
      lat: 0,
      lng: 0,
      tipo: 'apartamento',
      quartos: 2,
      suites: 0,
      vagas: 1,
      banheiros: 1,
      emNegociacaoFlag: false,
    }
    const { data, error } = await b.client.from('imoveis').insert(imovelParaRow(imovel)).select().single()
    exigir(!error, error?.message ?? '')
    imovelDeBId = data!.id
  })

  await checar('B NÃO consegue ler o contato do cliente de A, mesmo sem nenhuma negociação envolvida', async () => {
    const { data, error } = await b.client.from('leads_contato').select('*').eq('lead_id', leadDeAId)
    exigir(!error, error?.message ?? '')
    exigir((data ?? []).length === 0, 'B conseguiu ler leads_contato de um lead que não é dele')
  })

  await checar('sem negociação, B NÃO consegue mudar a etapa do lead de A', async () => {
    const { error } = await b.client.from('leads').update({ etapa: 2 }).eq('id', leadDeAId)
    exigir(!error, error?.message ?? '') // RLS bloqueia silenciosamente (0 linhas), não é erro
    const { data } = await a.client.from('leads').select('etapa').eq('id', leadDeAId).single()
    exigir(data!.etapa === 1, 'B conseguiu mudar a etapa de um lead de A sem negociação ligando os dois')
  })

  await checar('cria negociação ligando o lead de A ao imóvel de B', async () => {
    const { data, error } = await a.client
      .from('negociacoes')
      .insert({
        imovel_id: imovelDeBId,
        lead_id: leadDeAId,
        corretor_imovel_id: b.corretorId,
        corretor_cliente_id: a.corretorId,
        data_inicio: new Date().toISOString(),
        status: 'ativa',
      })
      .select()
      .single()
    exigir(!error, error?.message ?? '')
    negociacaoVinculoId = data!.id
  })

  await checar('COM negociação, B consegue mudar a etapa do lead de A (mover imóvel move cliente vinculado)', async () => {
    const { error } = await b.client.from('leads').update({ etapa: 4 }).eq('id', leadDeAId)
    exigir(!error, error?.message ?? '')
    const { data } = await a.client.from('leads').select('etapa').eq('id', leadDeAId).single()
    exigir(data!.etapa === 4, 'a etapa do lead de A não mudou mesmo com negociação ligando os dois')
  })

  await checar('mesmo com negociação, B NÃO consegue mudar o nome do lead de A (dado do dono, não de funil)', async () => {
    const { error } = await b.client.from('leads').update({ nome: 'hackeado' }).eq('id', leadDeAId)
    exigir(error != null, 'B conseguiu alterar o nome de um lead de outro corretor')
    const { data } = await a.client.from('leads').select('nome').eq('id', leadDeAId).single()
    exigir(data!.nome !== 'hackeado', 'o nome do lead de A foi alterado por B')
  })

  await checar('com a mesma negociação, A consegue mudar a etapa do imóvel de B (mover cliente move imóvel vinculado)', async () => {
    const { error } = await a.client
      .from('imoveis')
      .update({ etapa: 'e', em_negociacao_flag: true })
      .eq('id', imovelDeBId)
    exigir(!error, error?.message ?? '')
    const { data } = await b.client.from('imoveis').select('etapa').eq('id', imovelDeBId).single()
    exigir(data!.etapa === 'e', 'a etapa do imóvel de B não mudou mesmo com A tendo negociação ligando os dois')
  })

  await checar('mesmo vinculado, A NÃO consegue mudar o valor de venda do imóvel de B (só o dono do imóvel preenche)', async () => {
    const { error } = await a.client.from('imoveis').update({ valor_venda: 999999 }).eq('id', imovelDeBId)
    exigir(error != null, 'A conseguiu alterar valor_venda de um imóvel de outro corretor')
    const { data } = await b.client.from('imoveis').select('valor_venda').eq('id', imovelDeBId).single()
    exigir(data!.valor_venda == null, 'valor_venda do imóvel de B foi alterado por A')
  })

  let negociacaoSoDeAId = ''
  await checar('B (não participa) NÃO consegue atualizar uma negociação só entre A e A mesmo', async () => {
    const { data: nego, error: erroCria } = await a.client
      .from('negociacoes')
      .insert({
        imovel_id: imovelDeAId,
        lead_id: leadDeAId,
        corretor_imovel_id: a.corretorId,
        corretor_cliente_id: a.corretorId,
        data_inicio: new Date().toISOString(),
        status: 'ativa',
      })
      .select()
      .single()
    exigir(!erroCria, erroCria?.message ?? '')
    negociacaoSoDeAId = nego!.id

    const { error } = await b.client.from('negociacoes').update({ status: 'revertida' }).eq('id', nego!.id)
    exigir(!error, error?.message ?? '') // RLS bloqueia silenciosamente (0 linhas)
    const { data } = await a.client.from('negociacoes').select('status').eq('id', nego!.id).single()
    exigir(data!.status === 'ativa', 'B conseguiu alterar uma negociação da qual não participa')
  })

  // ---------- SEGURANÇA — permissões negativas com sessão realmente não-admin ----------
  console.log('\nSEGURANÇA (testado com uma sessão de verdade sem privilégio de admin)')

  await checar('B (não-admin) NÃO consegue promover o próprio papel para admin', async () => {
    await b.client.from('corretores').update({ papel: 'admin' }).eq('id', b.corretorId)
    // RLS bloqueia silenciosamente (0 linhas afetadas) em vez de erro — a
    // verificação real é reler o dado com a sessão de A
    const { data } = await a.client.from('corretores').select('papel').eq('id', b.corretorId).single()
    exigir(data!.papel === 'corretor', 'B conseguiu se promover a admin — falha grave de RLS')
  })

  await checar('B (não-admin) recebe 403 da função "equipe" ao tentar uma ação de admin', async () => {
    const { data: sessao } = await b.client.auth.getSession()
    const res = await fetch(`${e.VITE_SUPABASE_URL}/functions/v1/equipe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: e.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${sessao.session!.access_token}`,
      },
      body: JSON.stringify({ acao: 'criar_direto', nome: 'x', email: 'nao-deveria-existir@teste.local' }),
    })
    exigir(res.status === 403, `esperava 403, veio ${res.status}`)
  })

  await checar('B (não-admin) NÃO consegue apagar um registro (delete é admin-only)', async () => {
    await b.client.from('leads').delete().eq('id', leadDeAId)
    const { data } = await a.client.from('leads').select('id').eq('id', leadDeAId).maybeSingle()
    exigir(data != null, 'B conseguiu apagar um lead sem ser admin — falha grave de RLS')
  })

  // ---------- LIMPEZA ----------
  console.log('\nLIMPEZA (dados marcados deste script — a conta fixture do corretor B NÃO é apagada)')
  await checar('remover imóvel, cliente, vínculos, negociações e notificações de teste', async () => {
    // negociacoes primeiro: FK sem cascade pra leads/imoveis (mesmo motivo
    // de teste-fluxos.ts) — apagar o imóvel/lead antes falharia
    await a.client.from('negociacoes').delete().eq('id', negociacaoVinculoId)
    await a.client.from('negociacoes').delete().eq('id', negociacaoSoDeAId)
    for (const id of vinculosTeste) await a.client.from('vinculos').delete().eq('id', id)
    for (const id of notificacoesTeste) await a.client.from('notificacoes').delete().eq('id', id)
    await a.client.from('leads').delete().eq('id', leadDeAId)
    // imovelDeAId e imovelDeBId têm o mesmo endereco_rua (MARCADOR) — um filtro só pega os dois
    await a.client.from('imoveis').delete().eq('endereco_rua', MARCADOR)

    const { data: sobrouImovel } = await a.client.from('imoveis').select('id').eq('endereco_rua', MARCADOR)
    const { data: sobrouLead } = await a.client.from('leads').select('id').like('codigo', `${MARCADOR}%`)
    exigir((sobrouImovel?.length ?? 0) === 0, 'sobrou imóvel de teste')
    exigir((sobrouLead?.length ?? 0) === 0, 'sobrou cliente de teste')
  })

  console.log(`\n=== RESULTADO: ${passou} passaram, ${falhou} falharam ===`)
  if (falhou > 0) {
    falhas.forEach((f) => console.log('  • ' + f))
    process.exit(1)
  }
  console.log('Base preservada: nenhum dado real foi alterado.\n')
}

main().catch((erro) => {
  console.error('\n❌ erro fatal:', erro.message)
  process.exit(1)
})
