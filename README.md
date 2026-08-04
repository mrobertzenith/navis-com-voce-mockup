# NAVIS COM VOCÊ — CRM imobiliário

CRM por workflow para corretores de imóveis (produto by Navis). Kanban de imóveis e clientes,
motor de matching com score ponderado, gestão de equipe com papéis, autenticação e banco de
dados reais.

**Produção:** https://navis-crm.vercel.app

## Arquitetura

O frontend fala diretamente com o Supabase via SDK — não há servidor de aplicação próprio
para manter no ar.

```mermaid
flowchart LR
    subgraph client["Navegador do corretor"]
        UI["React SPA<br/>Vite · TanStack Query · Zustand"]
    end

    subgraph vercel["Vercel"]
        CDN["Build estático + CDN<br/>deploy automático a cada push"]
    end

    subgraph supabase["Supabase (São Paulo)"]
        AUTH["Auth<br/>login por corretor"]
        API["PostgREST<br/>API automática com RLS"]
        FN["Edge Function 'equipe'<br/>convites · papéis · desativação"]
        DB[("Postgres<br/>14 tabelas · 5 migrações")]
    end

    SENTRY["Sentry<br/>erros de produção"]
    RESEND["Resend<br/>SMTP de e-mails de auth"]

    UI --> CDN
    UI -->|supabase-js| AUTH
    UI -->|supabase-js| API
    UI -->|supabase-js| FN
    API --> DB
    FN --> DB
    AUTH -.-> RESEND
    UI -.->|erros| SENTRY
```

Decisões de arquitetura registradas em [MIGRACAO.md](MIGRACAO.md) (histórico da migração
mockup → produção). Destaques:

- **Fotos por link, sem storage**: o corretor cola a URL da foto do anúncio; o banco tem
  trava (`fotos_somente_url`) que rejeita imagens embutidas. Custo de storage: zero.
- **Segurança no banco, não só na tela**: RLS restringe todo acesso a e-mails cadastrados
  na tabela `corretores`; escrita em `corretores` e exclusões são exclusivas de admin;
  corretor suspenso é banido do login e perde acesso aos dados.
- **Modo mock preservado**: sem `.env.local`, o app roda 100% offline (MSW + localStorage) —
  útil para desenvolvimento e testes.

## Fluxos principais

### Autenticação e entrada na equipe

```mermaid
flowchart TD
    A["Admin abre Equipe → Adicionar corretor"] --> B{"Como?"}
    B -->|"Convite por e-mail"| C["Edge Function cria conta<br/>e envia link via Resend"]
    C --> D["Corretor clica no link →<br/>página Criar sua senha"]
    B -->|"Senha provisória"| E["Edge Function gera senha forte;<br/>admin envia por WhatsApp"]
    D --> F["Sessão ativa"]
    E --> F
    G["Login com e-mail e senha"] --> F
    F --> H{"E-mail existe em corretores<br/>e status ≠ suspenso?"}
    H -->|sim| I["App libera; RLS libera os dados"]
    H -->|não| J["Desconectado — sem acesso"]
```

### Pipeline de imóveis (Kanban)

```mermaid
flowchart LR
    a["Novo"] --> b["Análise e Estudo"] --> c["Produção"] --> d["Publicado"]
    d -->|"gate: exige cliente vinculado"| e["Em negociação"] --> f["Vendido"]
```

### Pipeline de clientes (Kanban)

```mermaid
flowchart LR
    1["Novo Cliente"] --> 2["Em contato"] --> 3["Visita agendada"]
    3 -->|"gate: exige imóveis da negociação"| 4["Em negociação"] --> 5["Negócio Fechado"] --> 6["Finalizado"]
    2 -.-> 7["Standby"]
    2 -.-> 8["Perdidos"]
```

As transições têm **gates** (validações por etapa em `src/domain/gatesImovel.ts` e
`gatesLead.ts`). O **matching** (`src/domain/matching.ts`) cruza o perfil de busca de cada
cliente com os imóveis e calcula um score 0–100 com pesos configuráveis por corretor.

## Rodando local

```bash
npm install
npm run dev
```

- **Sem `.env.local`** → modo mock: dados fictícios no navegador, sem login (útil pra
  desenvolver offline).
- **Com `.env.local`** → banco real + login obrigatório:

```
VITE_SUPABASE_URL=https://<projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_SENTRY_DSN=<dsn>            # opcional
```

## Scripts e operações

| Comando | O quê |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | typecheck + build de produção |
| `npm test` | testes (vitest) |
| `npm run lint` | eslint |
| `npx vite-node scripts/seed.ts` | carga dos dados de demonstração no banco (idempotente) |
| `npx supabase db push` | aplica migrações pendentes no banco remoto |
| `npx supabase functions deploy equipe` | publica a Edge Function de gestão de equipe |
| `npx supabase migration list` | confere paridade migrações local × remoto |

## Deploy

Automático: **push na `main` → Vercel builda e publica**. Variáveis de ambiente ficam em
Vercel → Settings → Environments → Production. Migrações de banco são aplicadas manualmente
via `npx supabase db push` (exige CLI logado e senha do banco).

## Estrutura

```
src/
  app/            rotas, layout, guardas (RequireAuth/RequireAdmin)
  components/     UI por domínio (imovel, lead, kanban, match, equipe…)
  domain/         tipos, etapas, gates e motor de matching (puro, testado)
  hooks/          TanStack Query — fala com Supabase (ou MSW no modo mock)
  lib/            supabase, mapeadores snake↔camel, sentry, formatação
  mocks/          modo demonstração (MSW + localStorage) e dados de seed
  pages/          telas
  stores/         zustand (auth, notificações, score, ui)
supabase/
  migrations/     schema versionado (fonte da verdade do banco)
  functions/      Edge Function 'equipe' (service role; só ela cria/gerencia contas)
scripts/seed.ts   dados de demonstração
```

## Gestão da equipe (tela Equipe, só admin)

Convidar corretor (e-mail ou senha provisória) · promover/rebaixar admin · desativar/reativar
· redefinir senha · excluir convite não usado. Travas: ninguém desativa a si mesmo nem remove
o próprio papel de admin (o sistema nunca fica sem administrador).

> E-mails de convite/redefinição usam Resend. Sem domínio verificado, entregam apenas para o
> e-mail do dono da conta Resend — para a equipe real, verificar um domínio próprio no Resend.
