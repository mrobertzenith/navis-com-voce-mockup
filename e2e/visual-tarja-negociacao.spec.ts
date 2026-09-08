import { expect, test } from '@playwright/test'

/**
 * Regressão visual do bug #6 (rodada 08/09): a tarja "Em negociação" era
 * desproporcional em cards estreitos, a ponto de cortar letras do próprio
 * texto. Screenshot do card inteiro (não só da fita) para pegar qualquer
 * regressão de layout ao redor dela também, não só o tamanho da fita isolada.
 */
test('@visual tarja "Em negociação" cabe no card, sem cortar texto nem estourar', async ({ page }, testInfo) => {
  await page.goto('/meus-imoveis')

  // no mobile o Kanban vira um seletor de aba + lista (não colunas lado a
  // lado) — a coluna "Em negociação" só fica ativa depois de um clique. O
  // botão só existe visível de fato depois que os dados mock terminam de
  // carregar, então deixa o Playwright esperar (auto-wait do .click()) em
  // vez de checar isVisible() de imediato.
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: /^Em negociação/ }).click()
  }

  // :visible filtra o card real do layout ativo — a marcação de mobile/desktop
  // (hidden md:block / md:hidden) deixa AMBOS os layouts no DOM ao mesmo tempo,
  // só um escondido via CSS
  const card = page
    .locator('[data-testid="card-imovel"]:visible')
    .filter({ has: page.locator('[data-testid="tarja-ribbon"]') })
    .first()
  await expect(card).toBeVisible()

  const tarja = card.locator('[data-testid="tarja-ribbon"]')
  await expect(tarja).toHaveText(/em negociação/i)

  await expect(card).toHaveScreenshot('card-imovel-em-negociacao.png')
})
