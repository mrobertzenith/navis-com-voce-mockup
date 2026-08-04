# Roteiro de migração para produção

Arquitetura alvo: **Vercel/Cloudflare Pages (frontend) + Supabase (Postgres, Auth, Storage, Edge Functions)**.
Legenda: **[VOCÊ]** = ação do Mário (contas, painéis, testes) · **[EU]** = código feito pelo Claude.

---

## Fase 1 — Fundação (banco de dados)

- [x] **[EU]** Supabase CLI instalado como devDependency + `supabase init`
- [x] **[EU]** Schema traduzido de `domain/types.ts` → `supabase/migrations/20260727000001_schema_inicial.sql`
      (14 tabelas, 9 enums, papel `admin`/`corretor` desde já, RLS habilitado com política transitória)
- [x] **[VOCÊ]** Criar conta gratuita em supabase.com (pode entrar com GitHub)
- [x] **[VOCÊ]** Criar projeto `navis-crm` (ref `spwndsircpzncbinalcs`)
- [x] **[VOCÊ]** Anotar em Settings → API: `Project URL`, `anon key` e a senha do banco
- [x] **[EU+VOCÊ]** Vincular o repo ao projeto (`npx supabase link`) e aplicar o schema (`npx supabase db push`)
- [ ] **[VOCÊ]** Conferir no painel do Supabase (Table Editor) que as 14 tabelas apareceram
- [ ] **[VOCÊ]** (segurança) Reset database password no painel — a senha atual apareceu em print

✅ Pronto quando: tabelas visíveis no painel; o app continua funcionando igual (ainda no mock).

## Fase 2 — Dados reais no lugar do mock

- [x] **[EU]** Script de seed: carga dos dados de demonstração (15 corretores/Ana admin, 35 imóveis, 25 leads)
- [x] **[EU]** Trocar o miolo dos hooks (`useImoveis`, `useLeads`...) do MSW pelo cliente Supabase
- [x] **[EU]** QA contra o banco real: leitura, edição via UI com verificação no Postgres, matching, joins
- [ ] **[VOCÊ]** Testar o app local: Kanban, cadastro, edição, matching — igual, mas persistindo de verdade

✅ Pronto quando: cadastra um imóvel, fecha o navegador, abre em outra máquina — ele está lá.

## Fase 3 — Login + administração (essencial: operador é pessoa de negócio)

- [x] **[EU]** Tela de login (Supabase Auth) + guarda de rota; fim do `CORRETOR_LOGADO_ID` fixo
- [x] **[EU]** RLS real: acesso restrito à equipe (e-mail precisa existir em `corretores`);
      escrita em `corretores` e deletes só admin. Aperto por dono fica pra Fase 4 (os fluxos
      cross-corretor de negociação ainda escrevem em registros do outro corretor)
- [x] **[VOCÊ]** Usuário `ana.silva@exemplo.com` confirmado (via SQL Editor) — login E2E
      verificado na API e no navegador (Dashboard com sessão real, nome no topo, sair)
- [x] **[VOCÊ]** Signups públicos desativados no painel
- [x] **[EU]** **Tela "Equipe" (só admin):** convidar corretor por e-mail, desativar/reativar,
      redefinir senha e excluir convite não usado — via Edge Function `equipe` (service role
      no servidor; valida papel admin; auto-desativação bloqueada). Testado E2E: UI → função
      → banco. Corretor suspenso é banido do login e perde acesso aos dados (migração 4)
- [x] **[EU]** Página "Definir senha" (destino dos links de convite e de recuperação)
- [ ] **[VOCÊ]** Painel → Authentication → URL Configuration → adicionar em **Redirect URLs**:
      `http://localhost:5173/navis-com-voce-mockup/definir-senha` (e depois a URL da Vercel)
- [ ] **[VOCÊ+EU]** ⚠️ **E-mails de convite de verdade exigem SMTP próprio** — o e-mail
      embutido do Supabase tem limite baixíssimo (deu rate-limit no teste) e só entrega
      para membros do projeto. Configurar Resend (grátis até 100/dia) ou similar antes de
      convidar corretores reais
- [ ] **[VOCÊ]** Testar o fluxo admin: convidar você mesmo (seu e-mail real) e ver o convite chegar

✅ Pronto quando: a pessoa de negócio gerencia a equipe sozinha, só pelo NAVIS.

## Fase 4 — Publicar na internet

- [ ] **[VOCÊ]** Criar conta na vercel.com (entrar com GitHub) e importar o repositório
- [ ] **[VOCÊ]** Colar as 2 variáveis de ambiente (URL + anon key) na configuração da Vercel
- [ ] **[EU]** Ajustar build: remover basename do GitHub Pages, configurar SPA fallback
- [ ] **[VOCÊ]** Deploy e teste da URL pública no celular

✅ Pronto quando: a corretora abre o link no celular e usa com login próprio.

## Fase 5 — Pipeline automatizado

- [ ] **[EU]** GitHub Actions: testes → preview por PR → `supabase db push` → deploy produção → smoke test
- [ ] **[VOCÊ]** Abrir um PR de teste e ver a URL de preview aparecer sozinha

## Fase 6 — Acabamento de produção

- [ ] **[EU]** Upload real de fotos (Supabase Storage) com compressão e limite de tamanho
- [ ] **[EU]** Matching no servidor (Edge Function + tabela `matches`) — ponto crítico de desempenho
- [ ] **[EU]** Sentry para capturar erros em produção
- [ ] **[VOCÊ]** (opcional) Domínio próprio (ex.: naviscomvoce.com.br) apontado na Vercel

---

## Notas técnicas

- **Convenção**: banco em `snake_case`, app em `camelCase` (conversão na camada de dados, Fase 2).
- **RLS transitória**: a migração 1 habilita RLS em tudo com política permissiva
  (`transicao_fase2_acesso_total`). A Fase 3 **substitui** essa política pelas regras reais —
  não publicar a URL do app antes disso.
- **Campos jsonb em `leads`** (`visitas_agendadas`, `negociacoes_ativas`): espelham o modelo
  atual do app para a Fase 2 ser mecânica; normalização fica para a Fase 4 (matching no servidor).
- Migração validada em Postgres embutido (PGlite): triggers, constraints e RLS conferidos.
