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

### B.6 Decisão do PO (09/09/2026)

Perguntas 1–4 do documento `Decisao_PO_Permissoes_Leads_Imoveis.pdf` respondidas:

1. **Leitura (matching)**: equipe toda vê nome do cliente, endereço, tipo e
   valor. Contato (telefone/e-mail) e observações da etapa "Em contato" NÃO
   são expostos a ninguém além do dono.
2. **Leitura (contato/observações)**: fechado — nem vínculo formal
   (negociação ativa) libera. Só quem cadastrou o lead.
3. **Escrita**: ninguém altera registro de outro corretor. Só visualiza o
   necessário pro match (nome, endereço, tipo, valor); o sistema é quem faz
   o match. **Valor da negociação não entra no CRM enquanto "em negociação"**
   — só quando vira venda, e quem preenche é o corretor do imóvel (o valor é
   do imóvel, não do cliente).
4. **Proteção real no banco** (não só filtro de tela) para telefone/e-mail/
   observações — dado sensível sai de `leads` pra uma tabela própria com
   política de RLS restritiva de verdade.

**⚠️ Conflito real encontrado entre a resposta 3 e o comportamento atual do
produto** (preciso de confirmação antes de implementar, não posso decidir
sozinho): hoje, `MeusImoveisPage.tsx` avança a ETAPA do lead de OUTRO
corretor automaticamente quando o corretor do imóvel move o card — ex.:
imóvel vai pra "Em negociação" → `atualizarLead.mutate({ id: neg.leadId,
patch: { etapa: 4 } })` (linha 296); imóvel é vendido → o lead comprador
vai pra etapa 5 (linha 235); reversão pelo lado do imóvel também regride a
etapa do lead (linha ~198). Isso é uma escrita cross-corretor real e usada
o tempo todo — sem ela, o card do cliente nunca saberia que o imóvel dele
avançou ou foi vendido, a não ser que o corretor do CLIENTE mova manualmente
(o que quebra a razão de ter negociação vinculada em primeiro lugar).

A resposta 3, lida ao pé da letra ("ninguém altera registro de outro"),
bloquearia exatamente essa escrita. A saída que não contradiz o espírito da
resposta (dado de contato continua intocável, só a ETAPA do card é
sistêmica) é: **`leads.etapa` deixa de ser uma coluna de escrita livre por
UPDATE e passa a mudar só através de uma função de banco
(`security definer`)** que:
- só aceita a transição se houver uma `negociacao` ativa/concluída/revertida
  ligando aquele `lead_id` ao `imovel_id` do corretor que está chamando;
- só altera a coluna `etapa` (e o array `pendente_aprovacao_imoveis`), nada
  mais do lead.

Ou seja, RLS deixa de proteger só por linha e passa a ter uma "porta lateral"
controlada por função pra esse caso específico — não é "abrir uma exceção
qualquer", é o único jeito de manter os dois requisitos (nada de escrita
livre cross-corretor E o Kanban do cliente continua se movendo sozinho)
verdadeiros ao mesmo tempo. **Preciso da sua confirmação nisso antes de
implementar** — ver pergunta ao final desta seção.

### B.7 Desenho de schema

```sql
-- dado sensível sai de leads pra tabela própria, 1:1
create table leads_contato (
  lead_id uuid primary key references leads (id) on delete cascade,
  email text,
  telefone_whatsapp text,
  observacoes text,
  origem origem_lead,
  descricao_origem text,
  motivo_standby text,
  motivo_perdido text,
  me_mantenha_informado boolean,
  data_entrada_standby timestamptz
);

-- RLS: só o dono do lead lê/escreve — nem com negociação ativa libera (resp. 2)
create policy "somente_dono_le" on leads_contato
  for select to authenticated
  using (lead_id in (select id from leads where corretor_responsavel_id = corretor_atual_id()));
create policy "somente_dono_escreve" on leads_contato
  for all to authenticated
  using (lead_id in (select id from leads where corretor_responsavel_id = corretor_atual_id()))
  with check (lead_id in (select id from leads where corretor_responsavel_id = corretor_atual_id()));

-- leads: equipe lê só campos de match (nome incluso, por decisão do PO);
-- update fica restrito ao dono, MENOS a função abaixo
drop policy "equipe_atualiza" on leads;
create policy "dono_atualiza" on leads
  for update to authenticated
  using (corretor_responsavel_id = corretor_atual_id())
  with check (corretor_responsavel_id = corretor_atual_id());

-- porta lateral controlada pra avanço de etapa via negociação (ver B.6)
create function avancar_etapa_lead_por_negociacao(p_lead_id uuid, p_imovel_id uuid, p_nova_etapa smallint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from negociacoes
    where lead_id = p_lead_id and imovel_id = p_imovel_id
      and corretor_imovel_id = corretor_atual_id()
  ) then
    raise exception 'sem negociação ligando esse lead a esse imóvel pra esse corretor';
  end if;
  update leads set etapa = p_nova_etapa where id = p_lead_id;
end;
$$;

-- imoveis: mesma lógica — equipe lê campos de match, update só do dono
drop policy "equipe_atualiza" on imoveis;
create policy "dono_atualiza" on imoveis
  for update to authenticated
  using (corretor_responsavel_id = corretor_atual_id())
  with check (corretor_responsavel_id = corretor_atual_id());

-- negociacoes.valor_negociado deixa de ser usado (resp. 3) — valor só em
-- vendas.valor_venda, preenchido pelo corretor_imovel_id na etapa "Vendido"
```

### B.8 Telas e arquivos afetados

- `src/lib/supabaseMap.ts` — split de `LEAD_CAMPOS` em campos públicos vs.
  `LEAD_CONTATO_CAMPOS` (nova tabela); `leadParaDominio` passa a receber o
  join opcional com `leads_contato` (null quando RLS bloqueia = não é dono).
- `src/domain/types.ts` — `Lead` mantém os campos de contato como opcionais
  (undefined quando o corretor não é dono, e a UI já sabe tratar campo
  ausente); considerar tipo `LeadComContato` vs `LeadPublico` se a distinção
  precisar ficar explícita no tipo.
- `src/hooks/useLeads.ts` — `fetchLeads` faz o join com `leads_contato`
  (retorna null pras linhas de outros corretores, sem erro — é esperado).
- `src/pages/MeusImoveisPage.tsx` — as 4 chamadas de `atualizarLead.mutate`
  pra lead de outro corretor viram uma nova mutation
  `avancarEtapaLeadPorNegociacao` (RPC pra função do banco), não mais UPDATE
  direto.
- `src/components/lead/CardCliente.tsx`, `ModalGateCliente.tsx`,
  `ModalGateImovel.tsx` — já tratam `visao='publica'` vs `'propria'`
  (confirmado: já escondem nome/contato hoje pra visão pública) — revisar se
  cobrem TODOS os campos de contato (telefone, observações) e não só nome.
- Formulário/card de "Em negociação" (`MeusClientesPage.tsx`/
  `MeusImoveisPage.tsx`) — remover a captura de `valorNegociado` na etapa 4/5
  de negociação; campo de valor só aparece no fechamento (etapa "Vendido"),
  preenchido pelo lado do imóvel.
- `scripts/teste-fluxos-cross-corretor.ts` e `teste-fluxos.ts` — precisam de
  casos novos: ler lead de outro corretor não deve trazer contato; tentar
  UPDATE direto em lead de outro corretor deve falhar; a função
  `avancar_etapa_lead_por_negociacao` deve funcionar só com negociação
  válida.

**Nota:** `TodosClientesPage.tsx` já anonimiza nome propositalmente (mostra
só código) por um motivo de produto diferente deste (incentivar contato via
corretor, não direto com o cliente) — a resposta 1 do PO não obriga mudar
essa tela; é uma decisão separada, sinalizo mas não mexo sem perguntar.

### B.9 Esforço estimado

- Tabela `leads_contato` + políticas + migração de dado existente
  (mover as colunas, não duplicar): ~meio dia.
- Função `avancar_etapa_lead_por_negociacao` + trocar as 4 chamadas em
  `MeusImoveisPage.tsx`: ~meio dia, com teste cross-corretor cobrindo.
- Ajustar `imoveis` (mesma lógica de update restrito ao dono): ~2h.
- Remover captura de `valorNegociado` na negociação (schema + telas): ~2h.
- Testes (`teste-fluxos-cross-corretor.ts` + `teste-fluxos.ts` + hooks): ~meio dia.
- **Total: ~2 dias**, com CI/teste real cobrindo cada etapa antes de seguir
  pra próxima (mesma disciplina da Parte A).

---

## Ordem sugerida se/quando isso for retomado

1. ~~RLS de `notificacoes` (B.4)~~ — feito (`78d8091`).
2. ~~Migração `negociacoes`/`vendas` (Parte A)~~ — feito (`07daa25`).
3. **RLS completo de `leads`/`imoveis` (B.6–B.9)** — decisão de produto já
   tomada; falta só a confirmação do ponto levantado em B.6 (a função
   `avancar_etapa_lead_por_negociacao`) antes de começar a implementar.
