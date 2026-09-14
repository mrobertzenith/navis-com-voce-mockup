# Correcoes imediatas para o Claude Code

Projeto: NAVIS COM VOCE - CRM imobiliario  
Objetivo: corrigir os pontos de seguranca e fluxo encontrados na auditoria do Codex.

> **Status (14/09/2026): itens 1-4 corrigidos, testados e em produção.** Item 5
> (rotacionar senha do banco) é ação manual no painel Supabase — só o Mário
> pode fazer, não está em código. Ver commit correspondente e
> `scripts/teste-fluxos-cross-corretor.ts` (seções "RLS DE INSERT POR DONO" e
> o teste de `alterar_papel` de ponta a ponta) pra verificação real contra o
> banco de produção.

## 1. Fechar brechas de RLS em inserts/updates por corretor

### Problema

A migracao `20260804000003_rls_somente_equipe.sql` criou politicas genericas:

- `equipe_insere`
- `equipe_atualiza`

Essas politicas aceitam qualquer usuario autenticado que esteja na tabela `corretores`.
Migracoes posteriores apertaram parte do modelo, principalmente updates de `leads`,
`imoveis`, `negociacoes` e `vendas`, mas ainda sobra permissao ampla em:

- inserts de `leads`
- inserts de `imoveis`
- tabelas com `corretor_id`, como `pesos_score`, `preferencias_notificacao`,
  `dismisses`, `interesses_posteriores`, `atividades`
- possivelmente outras tabelas auxiliares que ainda herdam `equipe_insere` ou
  `equipe_atualiza`

Na pratica, pela API Supabase, um corretor da equipe pode tentar criar ou editar
registros apontando para outro corretor, mesmo que a interface nao ofereca isso.

### Onde olhar

- `supabase/migrations/20260804000003_rls_somente_equipe.sql`
- `supabase/migrations/20260909000011_rls_granular_leads_imoveis.sql`
- `supabase/migrations/20260914000012_trigger_sincronia_negociacao.sql`
- `scripts/teste-fluxos-cross-corretor.ts`

### Correcao esperada

Criar uma nova migracao Supabase que substitua politicas genericas restantes por
politicas especificas por tabela.

Regras esperadas:

- `leads`: insert apenas quando `corretor_responsavel_id = corretor_atual_id()`.
- `imoveis`: insert apenas quando `corretor_responsavel_id = corretor_atual_id()`.
- `pesos_score`: insert/update apenas quando `corretor_id = corretor_atual_id()`.
- `preferencias_notificacao`: insert/update apenas quando `corretor_id = corretor_atual_id()`.
- `dismisses`: insert/update apenas quando `corretor_id = corretor_atual_id()`.
- `interesses_posteriores`: insert/update apenas quando `corretor_id = corretor_atual_id()`.
- `atividades`: insert apenas para o proprio `corretor_id`, ou admin/trigger se houver
  necessidade de auditoria centralizada.
- `notificacoes`: preservar leitura/update apenas do destinatario; para insert, decidir
  explicitamente se qualquer corretor participante pode criar notificacao para outro ou se
  isso deve migrar para trigger/Edge Function.
- `negociacoes` e `vendas`: manter regra de participante ja criada, revisando se ainda
  existe policy generica sobrando.

### Criterio de aceite

- Nenhuma tabela sensivel deve continuar com `with check (eh_da_equipe())` quando possuir
  uma coluna de dono como `corretor_id` ou `corretor_responsavel_id`.
- Adicionar ou ajustar testes em `scripts/teste-fluxos-cross-corretor.ts` para provar que:
  - corretor B nao cria lead para corretor A;
  - corretor B nao cria imovel para corretor A;
  - corretor B nao altera preferencias/pesos/dismisses/interesses de corretor A;
  - fluxos legitimos de negociacao cross-corretor continuam funcionando.

## 2. Tratar erros na Edge Function `equipe`

### Problema

Em `supabase/functions/equipe/index.ts`, algumas acoes fazem operacoes no banco e no
Supabase Auth sem checar `error`.

Casos principais:

- `desativar`
- `reativar`
- `alterar_papel`
- `excluir`

Hoje a funcao pode retornar `{ ok: true }` mesmo se o update no banco ou a operacao no Auth
falhar. Isso pode deixar `corretores.status`, papel e banimento de login fora de sincronia.

### Onde olhar

- `supabase/functions/equipe/index.ts`
- linhas das acoes `desativar`, `reativar`, `alterar_papel`, `excluir`
- `src/hooks/useEquipe.ts`
- `src/pages/EquipePage.tsx`

### Correcao esperada

Checar explicitamente o retorno de cada chamada:

- `admin.from(...).update(...)`
- `admin.from(...).delete(...)`
- `admin.auth.admin.updateUserById(...)`
- `admin.auth.admin.deleteUser(...)`
- `admin.auth.admin.getUserById(...)`

Retornar erro amigavel quando qualquer etapa falhar.

Tambem avaliar a ordem das operacoes:

- em `desativar`, se o banco atualiza mas o banimento falha, retornar erro claro e evitar
  sucesso falso;
- em `reativar`, se o Auth falha, nao dizer que reativou plenamente;
- em `excluir`, se deletar Auth e falhar deletar `corretores`, evitar deixar registro orfao
  sem tratamento.

### Criterio de aceite

- Nenhuma chamada Supabase/Auth critica fica sem verificar `error`.
- A UI de Equipe continua mostrando a mensagem especifica da funcao.
- Adicionar teste ou script de fluxo, se viavel, cobrindo pelo menos um erro retornado pela
  funcao.

## 3. Alinhar configuracao Supabase versionada com postura de producao

### Problema

`supabase/config.toml` ainda declara uma configuracao fraca/divergente:

- `enable_signup = true`
- `[auth.email] enable_signup = true`
- `enable_confirmations = false`
- `minimum_password_length = 6`
- `password_requirements = ""`
- `secure_password_change = false`
- `max_frequency = "1s"`

O arquivo `MIGRACAO.md` diz que signups publicos foram desativados no painel, mas o arquivo
versionado nao reflete isso. Isso cria risco de drift: um ambiente novo ou um push de config
pode reabrir cadastro publico ou manter politica de senha fraca.

### Onde olhar

- `supabase/config.toml`
- `MIGRACAO.md`
- painel Supabase de producao, Authentication settings

### Correcao esperada

Ajustar a configuracao versionada para refletir a intencao de producao:

- desativar signup publico;
- exigir senha minima de pelo menos 8 caracteres, idealmente 10 ou 12;
- configurar requisito de senha, por exemplo `lower_upper_letters_digits`;
- avaliar ativar confirmacao de e-mail para fluxos publicos, se isso nao quebrar convites;
- tornar rate limits menos permissivos para e-mails e reset de senha;
- documentar no README/MIGRACAO quais ajustes precisam ser conferidos manualmente no painel.

### Criterio de aceite

- `supabase/config.toml` nao contradiz mais `MIGRACAO.md`.
- Producao conferida no painel Supabase.
- Se alguma opcao precisar ficar diferente no local, documentar claramente o motivo.

## 4. Corrigir fluxo de recuperacao de senha

### Problema

Em `src/pages/LoginPage.tsx`, o reset de senha usa:

```ts
redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}login`
```

Mas a pagina preparada para consumir links de convite/recuperacao e permitir troca de senha
e `/definir-senha`.

`RequireAuth` redireciona links pendentes para `/definir-senha`, mas esse guard so roda nas
rotas internas protegidas. A rota `/login` fica fora dele. Resultado provavel: o usuario
clica no link de recuperacao e volta para o login, sem ver o formulario de nova senha.

### Onde olhar

- `src/pages/LoginPage.tsx`
- `src/pages/DefinirSenhaPage.tsx`
- `src/lib/supabase.ts`
- `src/app/RequireAuth.tsx`
- `src/app/router.tsx`

### Correcao esperada

Trocar o redirect do reset para:

```ts
redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}definir-senha`
```

Tambem considerar uma protecao extra em `/login`: se `tipoLinkAuthPendente()` existir, navegar
para `/definir-senha`. Isso evita regressao caso algum link antigo ainda aponte para `/login`.

### Criterio de aceite

- Link de "Esqueci minha senha" abre diretamente a tela de definir senha.
- Convite por e-mail continua abrindo a mesma tela.
- Adicionar teste unitario ou E2E simples para o redirect correto.

## 5. Rotacionar segredo exposto

### Problema

`MIGRACAO.md` ainda possui uma pendencia aberta:

> Reset database password no painel - a senha atual apareceu em print

Se isso ainda nao foi feito, e prioridade de seguranca.

### Correcao esperada

- Rotacionar senha do banco no painel Supabase.
- Conferir se algum secret correlato tambem foi exposto em print/log/chat.
- Atualizar Vercel/GitHub Secrets se algum valor dependente mudou.
- Marcar a pendencia como concluida em `MIGRACAO.md`.

### Criterio de aceite

- Senha antiga nao funciona mais.
- Ambientes que dependem do banco continuam funcionando.
- `MIGRACAO.md` reflete o estado real.

## Verificacoes ja executadas pelo Codex

- `npm test`: passou, 95 testes.
- `npm run build`: passou.
- `npm run lint`: passou com 5 warnings de Fast Refresh, sem erros.

Warnings de lint encontrados:

- `src/app/layout/Sidebar.tsx`
- `src/components/dashboard/DonutChart.tsx`
- `src/components/ui/button.tsx`
- `src/main.tsx`

Esses warnings nao sao prioridade de seguranca, mas podem ser limpos depois.

## Prioridade sugerida

1. RLS por dono/participante.
2. Erros na Edge Function `equipe`.
3. Reset/fortalecimento das configuracoes Supabase.
4. Fluxo de recuperacao de senha.
5. Rotacao da senha do banco, se ainda estiver pendente.
