import { defineConfig } from '@playwright/test'

/**
 * Suíte de navegador real — a camada que faltava (ESTRATEGIA_QA.md §2, camada 4).
 * Roda 100% no modo mock do app (MSW + localStorage, ver .env.e2e): sem
 * Supabase real, sem credencial nenhuma, sem efeito colateral em produção —
 * cada worker do Playwright começa com localStorage vazio, então os testes
 * são isolados por natureza.
 *
 * Dois projetos (desktop/mobile) porque dois dos nove bugs da rodada 08/09
 * eram puramente de layout e só existiam em certa largura de tela — sem
 * rodar em mais de um viewport, esse tipo de regressão passa despercebido.
 */
const PORTA = 5183

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  expect: {
    // limiar pequeno pra tolerar antialiasing entre máquinas sem deixar passar
    // uma tarja/drawer genuinamente deformado
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },
  use: {
    baseURL: `http://localhost:${PORTA}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npx vite --mode e2e --port ${PORTA} --strictPort`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: !process.env.CI,
    env: { VERCEL: '1' }, // base "/" em vez de "/navis-com-voce-mockup/" — só facilita as URLs do teste
    timeout: 30_000,
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
  ],
})
