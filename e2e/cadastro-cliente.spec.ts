import { expect, test } from '@playwright/test'

/**
 * Fluxo completo do wizard de cliente num navegador de verdade — não é
 * redundante com CadastroClientePage.test.tsx (RTL): foi justamente num
 * navegador real, com timing real de clique, que o bug #1/#2 da rodada
 * 08/09 apareceu (cliques sintéticos em sequência não reproduziam). Esta é
 * a camada que mais se aproxima de como o corretor realmente usa o sistema.
 */
test('cadastra um cliente do início ao fim, passando pelos 3 passos do wizard', async ({ page }) => {
  await page.goto('/clientes/novo')
  await expect(page.getByText('Passo 1 de 3')).toBeVisible()

  await page.getByLabel('Nome').fill('Cliente E2E Playwright')
  await page.getByRole('button', { name: 'Próximo' }).click()
  await expect(page.getByText('Passo 2 de 3')).toBeVisible()

  await page.getByRole('button', { name: 'Apartamento' }).click()

  await page.locator('text=UF').first().click()
  await page.getByRole('option', { name: /São Paulo/ }).click()
  await page.getByLabel('Cidade').fill('Ribeirão Preto')
  await page.getByLabel('Bairros de interesse (um ou mais)').fill('Centro')
  await page.getByRole('button', { name: 'Adicionar' }).click()
  await page.getByLabel('Até (R$)').fill('500000')

  await page.getByRole('button', { name: 'Próximo' }).click()
  await expect(page.getByText('Passo 3 de 3')).toBeVisible()

  await page.getByRole('button', { name: 'Concluir cadastro' }).click()

  // volta pra listagem e o cliente novo aparece na coluna "Novo Cliente"
  await expect(page).toHaveURL(/\/meus-clientes$/)
  // :visible — o layout mobile/desktop deixa os dois no DOM ao mesmo tempo,
  // só um escondido via CSS conforme o viewport
  await expect(page.locator(':visible', { hasText: 'Cliente E2E Playwright' }).first()).toBeVisible()
})
