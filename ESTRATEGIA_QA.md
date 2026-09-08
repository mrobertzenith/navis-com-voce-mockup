# Estratégia de QA — Navis CRM

Diagnóstico honesto do estado atual de qualidade do sistema e um plano concreto para
fechar os buracos que já custaram dois rounds de bugs achados por usuário real em
produção (Rodrigo e Julia, edições anteriores e 08/09). Não é um documento de boas
intenções — cada recomendação está amarrada a um bug real que ela teria pego, ou a uma
lacuna que hoje deixa o sistema sem rede de segurança nenhuma.

---

## 1. Diagnóstico crítico do estado atual

### 1.1 A única rede de segurança hoje sou eu, numa conversa

Não existe CI. `git push origin main` vai direto para produção (Vercel) sem qualquer
verificação automática. `tsc`, `vitest`, `eslint`, `build` e o script de fluxos só rodam
quando alguém (neste caso, eu, manualmente, dentro de uma sessão de chat) lembra de
rodar antes do push. Não há arquivo em `.github/workflows`, nenhum hook de pre-push,
nenhum gate.

Isso significa que a qualidade do que chega em produção depende inteiramente de
disciplina manual, não de processo. Já funcionou até aqui porque houve disciplina — mas
"o assistente lembrou de rodar os testes" não é uma estratégia de QA, é sorte
disciplinada. Um push feito com pressa, por qualquer pessoa, em qualquer sessão futura,
vai direto ao ar sem ninguém (nem nada) verificar.

**Isso é a lacuna nº 1 e a de maior alavancagem para fechar** — é barata, mecânica, e
elimina uma classe inteira de risco de uma vez.

### 1.2 A pirâmide de testes está invertida — e vazia onde mais precisa

Hoje existem:
- **3 arquivos de teste unitário** (`normalizacao.test.ts`, `matching.test.ts`,
  `supabaseMap.test.ts`), 36 testes no total — bons, mas cobrem só três módulos.
- **1 script de fluxos ponta a ponta** (`scripts/teste-fluxos.ts`), rodado manualmente,
  20 cenários contra o banco real — valioso, mas é 100% API/banco, nunca passa pela
  interface. Não existe nenhuma camada de teste de componente React nem de navegador
  automatizado.

E o que **não** tem nenhum teste automatizado:

| Módulo | Testes | Por que isso importa |
|---|---|---|
| `src/domain/gatesLead.ts` | **zero** | é a lógica que decide o que é obrigatório para mover um cliente de etapa — exatamente a área dos bugs #1, #2 e #5 desta rodada e do botão "Concluir cadastro" da rodada anterior |
| `src/domain/gatesImovel.ts` | **zero** | mesma classe de risco, para imóvel |
| Componentes de wizard (`CadastroClientePage`, `CadastroImovelPage`) | **zero** | é onde vive a condição de corrida que salvava cadastro incompleto — nenhum teste de componente existe para a transição entre passos |
| Hooks (`useImoveis`, `useLeads`, `useNotificacoes`, `useVinculos`, `useEquipe`) | **zero** | é onde o bug de notificação foi para o corretor errado — um teste de hook que afirma "o insert vai para `imovel.corretorResponsavelId`" pegaria isso em segundos |
| Qualquer componente visual (cards, tarjas, modais, drawers) | **zero** | bugs #3 (drawer) e #6 (tarja) desta rodada eram puramente de layout — só foram achados por inspeção visual manual |

Cada bug relatado nesta rodada e na anterior mapeia para uma dessas lacunas. Isso não é
coincidência: o sistema testa bem o que é fácil de testar (funções puras de
normalização e matching) e não testa nada do que é difícil de testar (lógica de gate
com estado, wizards com passos, layout responsivo, comportamento cross-corretor) —
que é exatamente onde os bugs reais vivem.

### 1.3 Bugs que só existem com dois usuários reais — e não há como testar isso hoje

O bug mais grave desta rodada (sistema de notificações inteiramente local, nunca
sincronizado com o banco) sobreviveu desde a criação da funcionalidade sem ser
detectado. A razão estrutural: **nenhum teste, manual ou automatizado, jamais rodou
com duas sessões de corretores diferentes ao mesmo tempo.** O próprio
`scripts/teste-fluxos.ts` roda como uma única sessão (Ana Silva, admin). A investigação
do bug #4 desta rodada (dúvida sobre vazamento de clientes entre corretores) não pôde
ser confirmada ou descartada de forma conclusiva pela mesma razão: não existe um jeito
automatizado de logar como dois corretores reais e comparar o que cada um vê.

Isso é agravado pelo modelo de segurança do banco: a política de RLS (`equipe_le`)
permite que qualquer corretor autenticado leia todas as linhas de `leads`, `imoveis` e
`notificacoes` da equipe — quem impede um corretor de ver dados que não deveria é
**filtro no código do cliente**, não o banco. Isso é uma decisão de arquitetura
documentada como transitória, mas enquanto for verdade, qualquer filtro esquecido ou mal
escrito é um vazamento de dados silencioso entre corretores, e hoje isso não tem
nenhuma cobertura de teste.

### 1.4 Um bug só reproduziu com timing realista — a maioria das suítes de teste não pegaria

A investigação do bug #1/#2 desta rodada mostrou algo importante sobre como testar este
sistema: cliques disparados em sequência rápida via script **não** reproduziam o
problema; cliques reais, espaçados como um humano faz, **reproduziam de forma
consistente**. Isso é uma pista de que testes de componente escritos com clique
sintético instantâneo (`fireEvent.click` sem esperar microtasks, por exemplo) teriam
passado mesmo com o bug presente. Qualquer suíte futura de teste de componente para os
wizards precisa levar isso em conta — testar com `@testing-library/user-event`
(que simula digitação e cliques com timing realista, incluindo delays entre eventos) em
vez de disparar eventos sintéticos instantâneos, e incluir explicitamente um teste que
tenta "adiantar" o submit antes do último passo.

### 1.5 Monitoramento em produção existe, mas ninguém sabe se está sendo observado

O Sentry está de fato configurado (`src/lib/sentry.ts`) e o DSN está presente no
ambiente local — mas não há evidência de que os alertas são revisados com alguma
cadência, nem de que o `tracesSampleRate: 0` (sem tracing, só captura de erro) é uma
escolha ativa vs. esquecida. O Vercel Web Analytics também está instalado
(commit `21fece7`), mas de novo: instrumentação sem processo de revisão é um sensor
que ninguém olha.

### 1.6 Resumo do diagnóstico

O sistema tem peças boas (RHF+Zod, TanStack Query, TypeScript estrito, RLS habilitado,
Sentry instalado, um script de fluxos E2E genuíno contra o banco real) — mas elas
formam uma **fachada de qualidade**: parece maduro por ter as ferramentas certas
instaladas, mas a cobertura real de teste está concentrada onde é barato testar, não
onde o risco está. E não existe processo nenhum impedindo uma regressão de chegar à
produção — dependeu, até agora, inteiramente de disciplina manual dentro de uma
conversa.

---

## 2. Estratégia proposta — pirâmide de testes fechada, por camada

### Camada 0 — Gate de CI/CD (pré-requisito para tudo abaixo)

**O que fazer:** um workflow do GitHub Actions que roda em todo push e todo PR:
`tsc -b` → `vitest run` → `eslint .` → `npm run build` → (quando existir, ver Camada 3)
`playwright test`. Bloqueia merge/push em `main` se qualquer etapa falhar.

**Por que é P0:** sem isso, todo investimento nas camadas abaixo é opcional — alguém
(humano ou IA) pode sempre esquecer de rodar localmente. Com isso, fica estruturalmente
impossível.

**Custo:** baixo — um arquivo YAML, sem infraestrutura nova.

### Camada 1 — Testes unitários de domínio (lógica pura, sem I/O)

**Onde:** `src/domain/*.ts` — expandir para 100% dos módulos de regra de negócio.

**Prioridade imediata:** `gatesLead.ts` e `gatesImovel.ts`. São funções puras,
determinísticas, baratas de testar e responsáveis pela lógica exata que já causou bugs
duas vezes. Cada transição de etapa (`avaliarTransicaoLead`, `avaliarTransicaoImovel`)
merece um teste por campo obrigatório, incluindo:
- campo ausente → aparece em `faltantes`;
- campo presente e válido → não aparece;
- combinação de múltiplos campos faltando simultaneamente;
- transições que exigem confirmação (`requerConfirmacao`) sinalizam corretamente;
- casos de borda: string vazia vs. `undefined` vs. `null` sendo tratados como
  "faltando" de forma consistente (é fácil um `!!campo` e um `campo != null` discordarem
  entre si — isso já foi uma classe de bug real neste projeto, com o `null` em campo
  obrigatório do banco na rodada anterior).

Meta: qualquer PR que mexer em `gatesLead.ts`/`gatesImovel.ts` sem tocar em teste
correspondente deveria ser motivo de revisão automática recusada (ver Camada 0 +
cobertura mínima via `vitest --coverage` com threshold).

### Camada 2 — Testes de integração de hooks (contrato com o banco)

**Onde:** `src/hooks/*.ts`, com um cliente Supabase mockado (ou um projeto de teste
dedicado, apartado do banco de produção).

**O que testar especificamente:** o *payload* que cada mutation envia, não só se ela
"funciona". O bug de notificação indo para o corretor errado é, na essência, um teste
de contrato: "ao criar uma notificação de aprovação de negociação para um imóvel de
outro corretor, `destinatarioCorretorId` deve ser `imovel.corretorResponsavelId`, nunca
`CORRETOR_LOGADO_ID`". Esse tipo de asserção é barato de escrever e teria pego o bug
sem precisar de dois logins reais.

Cobrir também: `useCriarVinculo` (grava o vínculo real — hoje só verificado
manualmente, uma vez, nesta sessão), `useAtualizarNotificacao`, e o tratamento de erro
de CNM duplicado em `useImoveis.ts` (incluindo a mensagem que nomeia o corretor dono).

### Camada 3 — Testes de componente (React Testing Library)

**Prioridade máxima:** os dois wizards (`CadastroClientePage`, `CadastroImovelPage`).
Testes específicos, todos rastreáveis a bugs reais:
- preencher até o penúltimo passo e tentar forçar um submit (via `form.requestSubmit()`
  direto, simulando o que a condição de corrida faz) → o cadastro **não** pode ser
  persistido, e o usuário deve ser levado de volta ao último passo com aviso — este é
  exatamente o teste de regressão para a trava adicionada nesta sessão, e hoje **não
  existe**, então nada impede alguém de remover a trava sem perceber;
- completar o wizard inteiro com dados válidos → persiste;
- tentar avançar de passo com campo obrigatório vazio → bloqueado, com destaque do
  campo;
- usar `@testing-library/user-event` (não `fireEvent`) para preservar o timing realista
  que expôs o bug original.

Segunda prioridade: componentes com lógica visual condicional que já quebrou —
`Tarja` (não estourar largura do card em qualquer tamanho), `ListaMatches`/
`DrillDownMatch` (não vazar/apertar com 1, 2 ou 3 botões visíveis simultaneamente).

### Camada 4 — Testes end-to-end de navegador (Playwright)

Hoje, tudo que só aparece na interface (layout, responsividade, fluxo completo entre
telas) é verificado manualmente, por mim, dirigindo um navegador dentro de uma sessão
de chat. Isso funciona, mas não escala, não roda em CI, e não é repetível de forma
confiável entre sessões.

**Converter em suíte Playwright, versionada e rodando em CI:**
- fluxo completo de cadastro de cliente e de imóvel, do zero ao card aparecendo no
  Kanban;
- mover um card pelo Kanban inteiro, respeitando os gates de cada etapa;
- abrir um match a partir do drill-down de um cliente, vincular um imóvel de outro
  corretor, confirmar que o vínculo aparece;
- **testes de viewport**: os dois bugs de layout desta rodada (drawer estreito, tarja
  grande) só existiam em determinada largura de tela. Rodar a suíte crítica em pelo
  menos dois viewports (mobile ~375px, desktop ~1280px) precisa ser padrão, não uma
  checagem manual pontual como foi desta vez.
- **snapshot visual** (Playwright tem isso nativo) para os componentes que já
  regrediram visualmente: card de imóvel com tarja, drawer de matches. Screenshot
  comparado a uma referência aprovada — qualquer mudança de layout não intencional
  quebra o teste.

### Camada 5 — Testes de segurança e isolamento entre corretores

Esta é a camada que **não existe hoje de nenhuma forma** e que teria fechado a dúvida
em aberto do bug #4 desta rodada.

**Construir:** uma extensão do padrão já usado em `scripts/teste-fluxos.ts`, mas com
**duas sessões autenticadas simultâneas** (dois corretores reais de teste, criados e
destruídos pelo próprio script). Testes mínimos:
- corretor A cria um lead/imóvel; corretor B não deve vê-lo em nenhuma tela cujo
  filtro afirme ser "meus imóveis"/"meus clientes" — testado direto contra o que a
  função de filtro do cliente devolve, não só contra o banco (porque o banco, via RLS,
  já devolve tudo — é o filtro do app que é a fronteira real hoje);
- notificação criada por A para B: B consegue lê-la; A não a vê na própria caixa;
- vínculo/negociação envolvendo imóvel de B: notificação chega para B, não para A;
- tentativa de um corretor comum de escalar o próprio papel para admin via API
  (já existe um teste assim em `teste-fluxos.ts` — expandir a mesma ideia para outras
  fronteiras de permissão, como editar imóvel de outro corretor diretamente pela API).

Isso deveria rodar com a mesma frequência que o resto (idealmente em CI, ou pelo menos
como rotina obrigatória antes de qualquer mudança que toque em RLS, notificações ou
filtros de "meus X").

### Camada 6 — Observabilidade e processo de revisão

- Confirmar que `VITE_SENTRY_DSN` está de fato configurado no ambiente de produção do
  Vercel (não só local) e definir quem revisa os alertas e com que frequência.
- Ativar `tracesSampleRate` acima de zero pelo menos de forma amostral, para conseguir
  ver não só "deu erro" mas "onde no fluxo o usuário estava quando deu erro" —
  relevante justamente para bugs de timing como o do wizard.
- Definir um canal/rotina para o Vercel Web Analytics ser olhado, não só coletado.

---

## 3. Processo — "Definition of Done" para qualquer mudança

Formalizar como checklist de PR (não só como memória tribal), cobrindo o que já é
prática nesta sessão mas precisa sobreviver a quem não tem esse contexto:

1. **Dado real, não só sucesso na tela.** Toda mudança que grava dado precisa ser
   verificada no banco, não só pela mensagem de sucesso na interface — a "rede de
   segurança contra falha silenciosa" da rodada anterior existe exatamente por isso.
2. **Casos de borda, não só o caminho feliz.** Campo vazio vs. nulo vs. ausente; usuário
   sem permissão; corretor tentando ver/editar dado de outro corretor.
3. **Efeitos colaterais mapeados.** Uma mudança em `gatesLead`/`gatesImovel` pode afetar
   3 telas diferentes que os consultam (isso já aconteceu: `ModalGateCliente`,
   `CadastroClientePage` e `ListaMatches` compartilhavam a mesma lógica de filtro
   copiada e colada, com pequenas divergências entre si — divergência que era, ela
   mesma, um bug).
4. **CRUD e permissões completos em telas de admin.** Não só criar/ler — editar,
   excluir, e checar quem tem permissão para cada ação.
5. **Teste com dois papéis/dois logins sempre que a mudança tocar em algo
   cross-corretor** (notificação, negociação, vínculo, match).
6. **Nunca declarar um fix funcionando sem verificação ao vivo** contra o app rodando
   (ou contra o banco real), quando a mudança for observável dessa forma.

---

## 4. Roteiro priorizado

| Prioridade | Ação | Esforço | Fecha a lacuna de | Status |
|---|---|---|---|---|
| P0 | CI no GitHub Actions: `tsc` + `vitest` + `eslint` + `build` bloqueando `main` | baixo | §1.1 — hoje não há nenhum gate automático | ✅ feito |
| P0 | Testes unitários completos de `gatesLead.ts` e `gatesImovel.ts` | baixo | §1.2 — zero cobertura na área de maior densidade de bugs | ✅ feito (39 testes) |
| P1 | Testes de componente dos dois wizards, com `user-event` e timing realista, incluindo o teste de regressão da trava de submit prematuro | médio | §1.2 + §1.4 — a trava desta sessão não tem nenhum teste que a proteja de ser removida | ✅ feito |
| P1 | Testes de hook para o payload das notificações e vínculos (contrato, não só "funciona") | baixo–médio | §1.2 — classe de bug do destinatário errado | ✅ feito |
| P1 | Suíte de dois corretores simultâneos (extensão de `teste-fluxos.ts`) | médio | §1.3 — única forma de fechar de vez a dúvida do bug #4 e prevenir a próxima | ✅ feito (13 testes, `test:fluxos-cross`) |
| P2 | Playwright: fluxos críticos + snapshot visual em 2 viewports | médio–alto | §1.2 + camada visual, hoje 100% manual | pendente |
| P2 | Revisão formal de Sentry/Analytics (DSN em prod, cadência de revisão) | baixo | §1.5 | pendente |
| P3 | Mover `teste-fluxos.ts` e `teste-fluxos-cross-corretor.ts` para rodar em CI (hoje são manuais — exigem segredo de login no ambiente do CI) | baixo | consolida §1.2/§1.3 no gate automático | pendente |

O P0 e o P1 estão concluídos (ver §5, abaixo, para o que cada item entregou de
fato). O que resta é a camada de navegador automatizado (P2) — a única forma
de fechar bugs puramente visuais como os das tarjas e do drawer sem depender
de alguém olhar manualmente — e mover as duas suítes contra o banco real para
dentro do CI, hoje limitadas por precisarem de credenciais que não devem virar
segredo de repositório sem mais cuidado (ver §5.3).

## 5. O que o P1 entregou, concretamente

Registro do que foi implementado, para não ficar só na intenção do roteiro
acima — e para quem for mexer nessas áreas depois saber que proteção já existe.

### 5.1 Testes de componente dos wizards

`src/pages/CadastroClientePage.test.tsx` e `CadastroImovelPage.test.tsx`, com
`@testing-library/react` + `@testing-library/user-event` (jsdom, configurado em
`vitest.config.ts` + `src/test/setup.ts`, incluindo os polyfills que o Radix UI
exige em ambiente de teste). Cada arquivo tem dois testes: o caminho feliz
completo (preenche os 3–4 passos, conclui, confirma o payload) e a regressão
específica do bug desta rodada — um `fireEvent.submit()` disparado direto no
`<form>` enquanto o wizard ainda está num passo intermediário, simulando
exatamente a condição de corrida original, sem depender de reproduzi-la de
verdade.

**Os dois testes de regressão foram verificados de forma adversarial**: a
trava (`if (passo !== PASSOS.length) {...}`) foi temporariamente desativada em
ambos os arquivos, os testes rodaram e falharam exatamente como esperado
(`criarLeadMock`/`criarImovelMock` chamados com o cadastro incompleto), e só
então a trava foi restaurada. Isso confirma que o teste protege algo de
verdade — não é só um teste que passa.

### 5.2 Testes de contrato dos hooks

`src/hooks/useNotificacoes.test.tsx` e `useVinculos.test.tsx`, com um duplo de
teste do cliente Supabase (`src/test/supabaseFake.ts`) que grava o payload
exato de cada `insert`/`update` em vez de simular sucesso genérico. A asserção
central é literalmente "o campo `destinatario_corretor_id` gravado é igual ao
que foi passado, nunca ao corretor logado" — o tipo de teste que teria
detectado o bug do destinatário errado sem precisar de duas sessões reais.

Também verificado adversarialmente: o `criarVinculo` de `useVinculos.ts` foi
temporariamente trocado por uma versão que só retorna sem gravar nada (a
versão fake que existia antes desta rodada de correções) e os testes
falharam corretamente antes de o código real ser restaurado.

### 5.3 Suíte de dois corretores simultâneos

`scripts/teste-fluxos-cross-corretor.ts` (`npm run test:fluxos-cross`), com
duas sessões reais e independentes: a admin já usada em `teste-fluxos.ts`
(corretor A) e um fixture novo, "ZZ Teste Fluxo B", criado uma única vez via a
própria função administrativa de gestão de equipe (`equipe`, ação
`criar_direto`) — não é dado de corretor real. As credenciais desse fixture
ficam em `.env.local` (fora do controle de versão) em
`TESTE_FLUXO_CORRETOR_B_EMAIL`/`_SENHA`; **a conta não pode ser recriada a
cada execução** porque a Edge Function só permite excluir um convite que nunca
fez login, e este precisa logar para o teste funcionar — por isso é reaproveitada
entre execuções, e o script limpa apenas os dados que cria (imóvel, cliente,
vínculo, notificação), nunca a conta em si.

13 verificações, todas passando contra o banco de produção real:
- **Visibilidade**: confirma que o RLS realmente libera leitura para toda a
  equipe (documentado, não é bug) e que o filtro "meus imóveis" do lado do
  cliente exclui corretamente o imóvel de outro corretor — a fronteira real
  hoje é essa, não o banco.
- **Notificações**: A cria uma notificação para B; B a enxerga usando a MESMA
  consulta que `fetchNotificacoes` usa no app; A não vê essa notificação na
  própria caixa. Esta é a verificação que nunca foi possível antes desta
  sessão — precisa de duas sessões reais para sequer fazer sentido.
- **Vínculo cross-corretor**: B (não-admin) vincula o próprio cliente a um
  imóvel de A, prova que a escrita cross-corretor funciona de ponta a ponta
  entre duas contas reais, não só em mock.
- **Segurança com sessão genuinamente não-admin** (a lacuna mais séria do
  teste de segurança anterior, que só testava o caminho permitido a partir da
  conta admin): B tenta se auto-promover a admin via update direto na tabela
  → bloqueado pelo RLS; B tenta chamar a função `equipe` → 403; B tenta
  apagar um registro → bloqueado (delete é admin-only).

Não está em CI ainda (por isso o P3 acima) — rodar contra o banco de produção
real a cada push exige decidir onde as credenciais de teste vivem com a
segurança adequada, o que é uma decisão deliberada a se tomar, não um detalhe
de implementação.
