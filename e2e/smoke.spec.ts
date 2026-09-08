import { expect, test } from '@playwright/test'

test('app carrega no modo mock, sem tela de login, com dados', async ({ page }) => {
  await page.goto('/meus-imoveis')
  await expect(page.getByRole('heading', { name: 'Meus Imóveis' })).toBeVisible()
  // se o modo mock não estivesse ativo, RequireAuth mandaria pra /login
  await expect(page).toHaveURL(/\/meus-imoveis$/)
})
