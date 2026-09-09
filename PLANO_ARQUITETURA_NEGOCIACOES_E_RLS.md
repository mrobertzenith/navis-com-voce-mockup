# Plano: migração para `negociacoes`/`vendas` + RLS Fase 4

> **Parte A: CONCLUÍDA em 08/09/2026.** Migração relacional feita, testada
> (`teste-fluxos.ts` 22/22 contra o banco real, CI verde nos dois jobs) e
> verificada em produção — Cliente #2403 (as 2 negociações reais que
> motivaram este plano) agora resolve corretamente via `negociacoes`, e os
> imóveis envolvidos aparecem em etapa `e` de forma consistente. Índice único
> parcial (`idx_negociacoes_imovel_ativa_unica`) em produção. Ver commit
> `07daa25` e detalhe em A.8 no fim desta seção.
>
> **Parte B (RLS Fase 4): passo 1 (notificações) CONCLUÍDO** (commit
> `78d8091`). Passo 2 (leads/imóveis, §B.3) segue pendente — precisa de
> decisão de produto antes de começar, não faz parte do escopo já executado.

Documento de planejamento para as duas mudanças estruturais identificadas
como dívida técnica séria (não cosméticas) durante a correção da rodada 03.
Não é trabalho de sessão pontual — é arquitetura, e mudança de arquitetura
malfeita quebra mais do que resolve. Este documento existe pra que a
execução, quando acontecer, seja numa sessão dedicada e com plano na mão, não
decidida no calor de outra tarefa.

**Contexto que motivou isso:** a trava aplicada em `4b9ed23` (trigger de
banco impedindo duas negociações ativas no mesmo imóvel) é uma rede de
segurança correta e já em produção — mas é um remendo sobre um modelo de
dados que já nasceu errado: `leads.negociacoes_ativas` é um array solto em
JSONB, sem chave estrangeira, sem `unique`, exigindo que toda tela que mexe
nisso (`MeusClientesPage`, `MeusImoveisPage`, `ModalGateCliente`,
`ModalGateImovel`) reimplemente a sincronia manualmente — e cada uma delas já
teve pelo menos um bug de sincronia relatado em produção (rodadas 08/09 e
03). O banco já tem a tabela certa para isso, criada na primeira migração e
nunca usada: `negociacoes` (com `status` ativa/revertida/concluída, FKs de
verdade pra `imoveis` e `leads`) e `vendas`.

---

## Parte A — Migrar para a tabela `negociacoes`/`vendas`

### A.1 Por que vale a pena

- **Impossível duplicar por acidente**: um `unique index` parcial
  (`where status = 'ativa'`) na coluna `imovel_id` de `negociacoes` faz o
  banco recusar a duplicidade *estruturalmente* — não precisa mais do
  trigger customizado que criamos como remendo.
- **Corrige o bug do "aparece só o código, sem nome"** relatado na rodada
  03: hoje, saber quem está negociando um imóvel exige varrer todos os
  `leads` procurando quem tem aquele `imovel_id` em `negociacoes_ativas`. Com
  a tabela relacional, é um `select * from negociacoes where imovel_id = ...
  and status = 'ativa'` com join direto pro nome do cliente.
- **Histórico de verdade**: hoje, reverter uma negociação APAGA a entrada do
  array (`negociacoesRestantes = ... filter(...)`) — não existe histórico de
  negociações que não deram certo. Com `status = 'revertida'` em vez de
  deletar a linha, esse histórico passa a existir de graça (relevante pro
  Dashboard e pro Ranking de Corretores, que hoje não têm como calcular
  "quantas negociações esse corretor perdeu").
- **`vendas`** já tem `revertida`, `justificativa_reversao`,
  `pagamentos_concluidos`, `chaves_entregues` — os mesmos campos que hoje
  vivem soltos em `leads` (`pagamentosConcluidos`, `chavesEntregues`). Migrar
  fecha esse espelhamento também.

### A.2 O que muda no schema

Nada de novo a criar — as tabelas já existem com a forma certa. Only
precisa: um índice parcial único.

```sql
create unique index idx_negociacoes_imovel_ativa_unica
  on negociacoes (imovel_id)
  where status = 'ativa';
```

(Esse índice sozinho, aliás, é uma alternativa MENOR e mais rápida de
implementar do que a migração inteira — ver "Opção intermediária" no fim
deste documento.)

### A.3 Mapeamento dos campos atuais → tabela nova

| Campo hoje (em `leads`, JSON) | Vira | Observação |
|---|---|---|
| `negociacoes_ativas: [{imovelId, dataInicio}]` | linha em `negociacoes` com `status='ativa'` | uma linha por entrada do array |
| reverter negociação (remove do array) | `update negociacoes set status='revertida', data_fim=now()` | não deleta — vira histórico |
| `imovel_fechado_id` + `valor_negociado` (em `leads`, etapa 5) | `status='concluida'` na negociação correspondente + linha nova em `vendas` | `vendas.valor_venda`, `vendas.corretor_imovel_id`/`corretor_cliente_id` já capturam os dois lados |
| `pagamentos_concluidos`, `chaves_entregues` (em `leads`) | mesmas colunas, já existentes em `vendas` | |
| reverter venda (`vendas.revertida`) | volta a negociação pra `status='ativa'` | fecha o bug #8 da rodada 03 (Vendido → Em negociação perdendo o vínculo) na raiz, sem precisar do código especial que escrevi hoje em `MeusImoveisPage.tsx` |

### A.4 Arquivos que precisam mudar (11, pelo grep atual)

```
src/domain/types.ts                         — tipos Lead/Imovel perdem os campos JSON, ganham leitura via join
src/domain/gatesLead.ts                     — gate de etapa 4/5 passa a checar negociacoes/vendas, não campos do lead
src/lib/supabaseMap.ts                      — remove o mapeamento dos campos JSON removidos
src/lib/supabaseMap.test.ts                 — idem
src/domain/gatesLead.test.ts                — fixtures precisam refletir o novo formato
src/pages/MeusClientesPage.tsx              — confirmarMovimentacao passa a escrever em negociacoes/vendas
src/pages/MeusImoveisPage.tsx               — idem, lado do imóvel
src/components/lead/ModalGateCliente.tsx    — imoveisNegociacaoCompativeis/imoveisDaNegociacaoAtiva viram queries reais
src/components/lead/ModalGateCliente.test.tsx — fixtures novas
src/components/imovel/ModalGateImovel.tsx   — leadsCompativeis idem
src/mocks/data/clientes.ts                  — seed do modo mock precisa do equivalente
```

Precisa também de um novo hook (`useNegociacoes.ts`, no padrão de
`useVinculos.ts`/`useNotificacoes.ts` já existentes) para ler/escrever a
tabela nova via React Query.

### A.5 Migração de dado existente

Script único, rodado uma vez, ANTES de tirar os campos JSON do app:

1. Para cada `lead` com `negociacoes_ativas` não vazio → inserir uma linha em
   `negociacoes` por entrada (`status='ativa'`), preenchendo
   `corretor_imovel_id`/`corretor_cliente_id` a partir dos dois registros.
2. Para cada `lead` com `imovel_fechado_id` preenchido → inserir a venda
   correspondente em `vendas`.
3. **Rodar isso ANTES de aplicar o índice único** da seção A.2 — se sobrar
   alguma duplicidade residual (não deveria, já limpei a que existia em
   `4b9ed23`), o índice recusaria a migração; melhor descobrir isso rodando
   o script em modo auditoria primeiro (mesmo padrão do
   `limpar_dados_teste.ts`: audita, só aplica com `--executar`).

### A.6 Ordem de rollout (pra não ter downtime nem perda de dado)

1. Criar o índice único parcial (bloqueia duplicidade nova a partir de agora
   — mas os campos JSON antigos continuam sendo a fonte de verdade do app
   até o passo 4).
2. Rodar o script de migração de dado (A.5), populando `negociacoes`/`vendas`
   a partir do que existe hoje em `leads`.
3. Trocar o app pra ler/escrever nas tabelas novas (os 11 arquivos), **mas
   manter os campos JSON sendo escritos em paralelo** por uma versão (gravar
   nos dois lugares) — permite reverter o deploy sem perder dado se algo
   quebrar.
4. Confirmado estável por alguns dias de uso real, remover a escrita
   duplicada e, só então, dropar as colunas JSON de `leads`
   (`negociacoes_ativas`, `imovel_fechado_id`, `valor_negociado`,
   `pagamentos_concluidos`, `chaves_entregues`).

### A.7 Esforço estimado

Um dia de trabalho focado (não uma tarefa de "mais uma correção"): schema +
migração de dado + 11 arquivos + testes atualizados (as suítes de
`gatesLead.test.ts`, `ModalGateCliente.test.tsx`, `teste-fluxos.ts` e
`teste-fluxos-cross-corretor.ts` todas tocam essa área e precisam ser
revisadas, não só ajustadas mecanicamente).

### Opção intermediária (se um dia inteiro não for viável agora)

Só o índice único parcial (seção A.2), sem migrar o resto: substitui o
trigger customizado (`impedir_negociacao_duplicada`) por uma restrição de
banco nativa e mais barata de manter, mas SEM ganhar o resto (histórico,
nome em vez de código, `vendas` estruturado). É uma troca de "remendo bom"
por "remendo um pouco melhor" — não fecha a dívida de verdade. Só faz
sentido como ponte se a decisão for adiar a migração completa por muito
tempo.

---

## Parte B — RLS Fase 4 (permissão de verdade no banco)

### B.1 O estado atual, sem rodeio

A política `equipe_le` (migração 3) libera **SELECT de tudo pra qualquer
corretor autenticado da equipe** — em `leads`, `imoveis`, `notificacoes`,
tudo. Quem impede um corretor de ver a carteira inteira dos colegas é
exclusivamente o filtro `.filter(i => i.corretorResponsavelId ===
CORRETOR_LOGADO_ID)` espalhado pelas telas. Qualquer chamada direta à API
REST do Supabase com um token válido de QUALQUER corretor da equipe lê tudo,
sem exceção — testável agora mesmo com `curl` e um token de login válido.

**Isso não é um bug — é uma fase declarada desde a criação do banco**
("Nota deliberada" na migração 2), mas ficou pendente por tempo demais pra
um sistema que já tem corretores reais testando com dado real.

### B.2 Por que é mais delicado que parece

Diferente da Parte A (puramente aditiva), apertar RLS é **subtrativo** — tudo
que hoje funciona confiando em "o banco deixa ler tudo" pode quebrar
silenciosamente se a política ficar restritiva demais. Fluxos que
DELIBERADAMENTE precisam ver dado de outro corretor (e não podem quebrar):

- Match entre imóvel de um corretor e cliente de outro (praticamente toda a
  proposta de valor do sistema).
- Aprovação de negociação cross-corretor (`useCriarNotificacao`,
  `ModalGateCliente`'s `imoveisNegociacaoCompativeis`).
- Vínculo de imóvel de um corretor ao cliente de outro (`useVinculos`).
- Ranking de Corretores e Dashboard (visão agregada da equipe).
- A suíte `teste-fluxos-cross-corretor.ts` inteira depende desse
  comportamento pra existir — qualquer mudança aqui precisa passar por ela
  primeiro.

### B.3 Direção recomendada (não "corretor só vê o que é dele")

Não é o modelo certo pra este produto — mataria o matching cross-corretor,
que é o motivo do sistema existir. O modelo certo é **granular por operação**:

| Operação | Quem pode |
|---|---|
| Ler dado básico de matching (endereço, tipo, valor, perfil de busca) | equipe toda (mantém como está) |
| Ler dado de contato pessoal do cliente (telefone, e-mail, observações internas) | só o dono, ou outro corretor com negociação ativa/vínculo formal envolvendo aquele cliente |
| Escrever em `leads`/`imoveis` de outro corretor | só campos específicos de negociação (`negociacoes_ativas` via a tabela nova, não o registro inteiro) — hoje `equipe_atualiza` libera UPDATE de QUALQUER coluna de QUALQUER registro pra qualquer um da equipe, o que é mais permissivo do que qualquer fluxo real precisa |
| Ler `notificacoes` de outro corretor | ninguém — já deveria ser só do destinatário, e não é (mesma política `equipe_le` genérica) |

Isso exige RLS por COLUNA ou views materializadas — Postgres não faz RLS por
coluna nativamente, então a implementação real seria: separar dado sensível
de cliente numa tabela/view à parte com política própria, ou mover a lógica
de match para uma Edge Function com `service_role` (que já é a direção
apontada desde a migração 2 — "aperto na Fase 4, quando gates e matching
migram para Edge Functions").

### B.4 Passo mais seguro pra começar

Antes de mexer em `leads`/`imoveis` (alto risco de quebrar matching), a
correção BARATA e de baixíssimo risco é **`notificacoes`**: hoje qualquer
corretor pode ler a notificação de qualquer outro (a política é a mesma
`equipe_le` genérica), o que não tem nenhuma razão de negócio — notificação é
sempre 1-pra-1. Trocar por uma política própria
(`using (destinatario_corretor_id = corretor_atual_id())`) é isolado, não
afeta matching, não afeta nenhum fluxo cross-corretor existente, e é
testável imediatamente pela suíte `teste-fluxos-cross-corretor.ts` que já
existe (já teria pego isso se já estivesse assim).

### B.5 Esforço estimado

- Notificações (B.4): baixo — algumas horas, incluindo teste.
- Modelo completo (B.3): grande — exige decisão de produto (o que é "dado
  sensível" vs. "dado de matching"), não só engenharia. Não estimo em dias
  sem essa decisão vir primeiro.

---

## Ordem sugerida se/quando isso for retomado

1. **RLS de `notificacoes` (B.4)** — menor risco, mais rápido, fecha uma
   exposição real sem tocar em nada crítico.
2. **Migração `negociacoes`/`vendas` (Parte A)** — maior benefício
   estrutural, escopo conhecido e fechado (11 arquivos listados).
3. **RLS completo de `leads`/`imoveis` (B.3)** — o mais arriscado e o que
   mais precisa de decisão de produto antes de qualquer linha de código;
   fazer por último, com as duas anteriores já estáveis.
