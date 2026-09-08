import { expect, test } from '@playwright/test'

/**
 * Espelha cadastro-cliente.spec.ts para o wizard de imóvel — mesma classe de
 * bug, mesmo botão único type="button" como correção real (ver o comentário
 * em CadastroImovelPage.tsx). Passa pelos 4 passos com clique físico real.
 */
test('cadastra um imóvel do início ao fim, passando pelos 4 passos do wizard', async ({ page }) => {
  await page.goto('/imoveis/novo')
  await expect(page.getByText('Passo 1 de 4')).toBeVisible()

  await page.locator('text=UF').first().click()
  await page.getByRole('option', { name: /São Paulo/ }).click()
  await page.getByLabel('Cidade').fill('Ribeirão Preto')
  await page.getByLabel('Bairro').fill('Centro')
  await page.getByLabel('Rua').fill('Rua Teste E2E Playwright')
  await page.getByLabel('Número').fill('100')

  await page.getByRole('button', { name: 'Próximo' }).click()
  await expect(page.getByText('Passo 2 de 4')).toBeVisible()

  await page.getByRole('button', { name: 'Apartamento' }).click()
  await page.getByRole('button', { name: 'Próximo' }).click()
  await expect(page.getByText('Passo 3 de 4')).toBeVisible()

  await page.getByRole('button', { name: 'Próximo' }).click()
  await expect(page.getByText('Passo 4 de 4')).toBeVisible()

  await page.getByRole('button', { name: 'Concluir cadastro' }).click()

  await expect(page).toHaveURL(/\/meus-imoveis$/)
  // :visible — o layout mobile/desktop deixa os dois no DOM ao mesmo tempo
  await expect(
    page.locator(':visible', { hasText: 'Rua Teste E2E Playwright' }).first(),
  ).toBeVisible()
})
