# NAVIS COM VOCÊ — Mockup navegável

Mockup de alta fidelidade do **NAVIS COM VOCÊ**, CRM por workflow para corretores de imóveis
pessoa física no Brasil (produto by Navis). Front-end completo com dados mock — **não é o MVP
funcional**, é a base visual e comportamental para testes de ponta a ponta antes do backend real.

**Demo publicada**: https://<owner>.github.io/navis-com-voce-mockup/

## O que é

- Todas as telas P1/P2 do produto com fidelidade visual e comportamental.
- Navegação real entre telas (React Router).
- Dados mock coerentes entre telas (mesmo dataset, sem backend).
- Motor de matching real (gates + score ponderado) — não são scores aleatórios.
- Interações-chave funcionais: drag-and-drop nos Kanbans, wizards de cadastro, drill-down de
  match, edição de score com recálculo.
- Estado persistido em `localStorage` durante a sessão. Botão "Resetar demo" no perfil do
  corretor volta aos dados default.

## O que NÃO é

- Não tem backend real, autenticação real ou API HTTP (MSW simula as respostas).
- Não tem persistência entre usuários — é single-user por navegador.
- Não envia notificações reais nem roda jobs assíncronos de verdade.

## Rodando local

```bash
npm install
npm run dev
```

## Build de produção

```bash
npm run build
npm run preview
```

## Deploy

Deploy automatizado via GitHub Actions (`.github/workflows/deploy.yml`) a cada push em `main`,
publicado em GitHub Pages. Não requer passo manual.
