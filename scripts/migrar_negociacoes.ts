/**
 * Migração de dado: leads.negociacoes_ativas/imovel_fechado_id (JSON solto)
 * → tabelas relacionais negociacoes/vendas.
 * Uso: npx vite-node scripts/migrar_negociacoes.ts [--executar]
 * Sem --executar, só audita o que seria migrado.
 *
 * Roda uma vez, depois que o app (useLeads.ts) já passou a LER os campos
 * negociacoesAtivas/imovelFechadoId/etc. a partir de negociacoes/vendas —
 * sem isso, negociações que só existem hoje como JSON em leads
 * "desapareceriam" da tela até essa migração rodar.
 * Ver PLANO_ARQUITETURA_NEGOCIACOES_E_RLS.md §A.5.
 */
import { createClient } from '@supabase/supabase-js'
import { env } from './lib/env'

const EXECUTAR = process.argv.includes('--executar')

const e = env()
const supabase = createClient(e.VITE_SUPABASE_URL, e.VITE_SUPABASE_ANON_KEY)

async function main() {
  const { error: erroLogin } = await supabase.auth.signInWithPassword({
    email: e.ADMIN_EMAIL ?? 'ana.silva@exemplo.com',
    password: e.ADMIN_SENHA ?? 'NavisDemo2026x',
  })
  if (erroLogin) throw new Error('Login admin falhou: ' + erroLogin.message)

  const { data: leads, error } = await supabase
    .from('leads')
    .select(
      'id, codigo, corretor_responsavel_id, negociacoes_ativas, imovel_fechado_id, valor_negociado, pagamentos_concluidos, chaves_entregues',
    )
  if (error) throw new Error('Falha ao ler leads: ' + error.message)

  const { data: imoveis, error: erroImoveis } = await supabase
    .from('imoveis')
    .select('id, corretor_responsavel_id')
  if (erroImoveis) throw new Error('Falha ao ler imoveis: ' + erroImoveis.message)
  const corretorDoImovel = new Map(imoveis.map((i) => [i.id, i.corretor_responsavel_id as string]))

  let negociacoesAtivasAMigrar = 0
  let fechamentosAMigrar = 0

  for (const lead of leads) {
    const ativas = (lead.negociacoes_ativas ?? []) as { imovelId: string; dataInicio: string }[]
    for (const n of ativas) {
      negociacoesAtivasAMigrar++
      console.log(
        `${EXECUTAR ? 'MIGRANDO' : '[auditoria]'} negociação ativa: ${lead.codigo} ↔ imóvel ${n.imovelId}`,
      )
      if (EXECUTAR) {
        const { error: erroInsert } = await supabase.from('negociacoes').insert({
          imovel_id: n.imovelId,
          lead_id: lead.id,
          corretor_imovel_id: corretorDoImovel.get(n.imovelId) ?? lead.corretor_responsavel_id,
          corretor_cliente_id: lead.corretor_responsavel_id,
          data_inicio: n.dataInicio,
          status: 'ativa',
        })
        if (erroInsert) console.error(`  falhou: ${erroInsert.message}`)
      }
    }

    if (lead.imovel_fechado_id) {
      fechamentosAMigrar++
      console.log(
        `${EXECUTAR ? 'MIGRANDO' : '[auditoria]'} negócio fechado: ${lead.codigo} ↔ imóvel ${lead.imovel_fechado_id}`,
      )
      if (EXECUTAR) {
        const agora = new Date().toISOString()
        const { data: negociacao, error: erroNeg } = await supabase
          .from('negociacoes')
          .insert({
            imovel_id: lead.imovel_fechado_id,
            lead_id: lead.id,
            corretor_imovel_id: corretorDoImovel.get(lead.imovel_fechado_id) ?? lead.corretor_responsavel_id,
            corretor_cliente_id: lead.corretor_responsavel_id,
            data_inicio: agora,
            data_fim: agora,
            status: 'concluida',
            valor_negociado: lead.valor_negociado,
          })
          .select()
          .single()
        if (erroNeg) {
          console.error(`  falhou (negociação): ${erroNeg.message}`)
          continue
        }
        const { error: erroVenda } = await supabase.from('vendas').insert({
          negociacao_id: negociacao.id,
          imovel_id: lead.imovel_fechado_id,
          lead_id: lead.id,
          corretor_imovel_id: negociacao.corretor_imovel_id,
          corretor_cliente_id: negociacao.corretor_cliente_id,
          valor_venda: lead.valor_negociado ?? 0,
          data_venda: agora,
          revertida: false,
          pagamentos_concluidos: Boolean(lead.pagamentos_concluidos),
          chaves_entregues: Boolean(lead.chaves_entregues),
        })
        if (erroVenda) console.error(`  falhou (venda): ${erroVenda.message}`)
      }
    }
  }

  console.log(
    `\n${negociacoesAtivasAMigrar} negociação(ões) ativa(s) e ${fechamentosAMigrar} negócio(s) fechado(s) ${
      EXECUTAR ? 'migrados' : 'encontrados (rode com --executar pra migrar de verdade)'
    }.`,
  )
}

main().catch((erro) => {
  console.error('\n❌ erro fatal:', erro.message)
  process.exit(1)
})
