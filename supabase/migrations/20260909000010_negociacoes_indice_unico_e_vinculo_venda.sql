-- ============================================================
-- NAVIS COM VOCÊ · Migração 10: negociações — a restrição de
-- verdade, e vínculo explícito negociação↔venda
--
-- Parte A do PLANO_ARQUITETURA_NEGOCIACOES_E_RLS.md. O trigger da migração 8
-- (impedir_negociacao_duplicada) era um remendo sobre leads.negociacoes_ativas
-- (JSON solto, sem chave estrangeira). Agora que a tabela `negociacoes`
-- (criada na migração 1, nunca usada até aqui) passa a ser escrita de
-- verdade pelo app, a MESMA regra vira uma restrição nativa do Postgres — um
-- índice único parcial, mais barato e mais robusto que um trigger
-- customizado. O trigger da migração 8 continua no lugar por enquanto (não
-- atrapalha; só dispara se algo ainda escrever em negociacoes_ativas) até a
-- coluna antiga ser removida de vez, depois de um tempo de uso real
-- confirmando a migração estável.
-- ============================================================

-- um imóvel não pode ter mais de uma negociação 'ativa' ao mesmo tempo —
-- agora impossível de violar, não importa o caminho de escrita
create unique index if not exists idx_negociacoes_imovel_ativa_unica
  on negociacoes (imovel_id)
  where status = 'ativa';

-- liga a venda à negociação que ela conclui (1:1) — sem isso, a única forma
-- de relacionar as duas seria casar imovel_id+lead_id, ambíguo com histórico
alter table vendas add column if not exists negociacao_id uuid references negociacoes (id);
create index if not exists idx_vendas_negociacao on vendas (negociacao_id);
