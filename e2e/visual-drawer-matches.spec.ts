import { expect, test } from '@playwright/test'

/**
 * Regressão visual do bug #3 (rodada 08/09): o drawer de possíveis negócios
 * era estreito demais para a linha de botões de ação ("Não interessou",
 * "Falar com o corretor", "Abrir"), que ficava espremida contra a borda.
 * Abre o drawer de um cliente de verdade (dado do mock) e tira o screenshot
 * do drawer inteiro — pega tanto o alargamento quanto o wrap dos botões.
 */
test('@visual drawer de matches abre com espaço confortável para os botões de ação', async ({ page }) => {
  await page.goto('/meus-clientes')

  // usa o seletor de tag (não getByRole): o card inteiro é um wrapper
  // arrastável do dnd-kit com role="button" próprio, cujo nome acessível
  // (concatenação do texto interno) também bate com essa mesma regex — pegar
  // por role pegaria o card inteiro (abre o detalhe do cliente), não este botão
  // :visible: o layout mobile/desktop (hidden md:block / md:hidden) deixa os
  // dois no DOM ao mesmo tempo, só um escondido via CSS conforme o viewport
  const botaoMatches = page.locator('button:visible', { hasText: 'possíveis negócios disponíveis' }).first()
  await expect(botaoMatches).toBeVisible({ timeout: 10_000 })
  await botaoMatches.click()

  const drawer = page.locator('[data-testid="drawer-matches"]')
  await expect(drawer).toBeVisible()
  // pelo menos um botão "Abrir" precisa estar de fato dentro da área visível do drawer,
  // não vazando ou cortado pela borda — é exatamente o que "deformada" descrevia
  await expect(drawer.getByRole('button', { name: 'Abrir' }).first()).toBeVisible()

  await expect(drawer).toHaveScreenshot('drawer-matches.png')
})
