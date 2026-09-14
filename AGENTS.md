# NAVIS COM VOCE - instrucoes para revisao

Este repositorio e um CRM imobiliario em React/Vite com Supabase como backend principal.
Ao atuar como revisor, trate mudancas em banco, autenticacao, RLS, funcoes Edge e fluxos de
negociacao como areas de maior risco.

## Code Review Rules

### Seguranca e acesso

- Sinalize qualquer mudanca que enfraqueca RLS, exponha dados entre corretores indevidamente,
  permita acesso de corretor suspenso ou mova validacoes sensiveis apenas para o frontend.
- Mudancas em `supabase/functions/equipe` devem preservar a regra de que operacoes de equipe
  passam pela Edge Function com privilegio controlado, sem expor service role ao cliente.
- Fluxos de admin nao podem permitir que o ultimo administrador perca o proprio papel, seja
  desativado por si mesmo ou deixe o sistema sem administrador.

### Fluxos de negocio

- Preserve os gates dos pipelines de imoveis e clientes: negociacao, venda, finalizacao e
  vinculos devem continuar coerentes nos dominios, hooks, mocks e banco.
- Sinalize inconsistencias entre o modo mock offline e o comportamento com Supabase real.
- O produto nao armazena nem exibe fotos de imoveis; nao reintroduza upload ou exibicao de
  imagens sem uma decisao explicita de produto.

### Banco e migracoes

- Toda alteracao estrutural no banco deve vir como migracao versionada em `supabase/migrations`
  e preservar compatibilidade com os mapeadores `snake_case`/`camelCase`.
- Regras que garantem integridade entre lead, imovel, negociacao, venda e notificacoes devem
  preferencialmente estar no banco quando evitarem divergencia entre telas ou clientes.
- Revise cuidadosamente efeitos de cascata, indices unicos, triggers e politicas que possam
  apagar, duplicar ou esconder dados de forma inesperada.

### Frontend e estado

- Evite duplicar regra de negocio complexa em componentes quando ela ja existe em `src/domain`,
  hooks ou migracoes.
- Mudancas visuais devem respeitar a interface operacional do CRM: densa, clara, responsiva e
  voltada para uso repetido por corretores.
- Estados de carregamento, erro, vazio e permissao devem continuar explicitos em telas que
  dependem de Supabase ou TanStack Query.

### Testes e verificacao

- Para mudancas em matching, normalizacao ou gates, espere testes unitarios em `src/domain`.
- Para mudancas em hooks ou integracao com Supabase/mock, espere testes proximos aos hooks ou
  fluxos afetados.
- Para alteracoes visuais relevantes em cards, drawers, kanban ou jornadas principais, considere
  testes E2E/visuais existentes antes de aprovar.
- Nao peca lint, formatacao ou checks mecanicos como regra de revisao quando a CI ou scripts do
  projeto ja conseguem capturar isso.
