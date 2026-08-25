import { test, expect } from '@playwright/test';

test.describe('Smoke', () => {
  test('la home risponde e mostra la pagina', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/localhost:8080|\/$/);
    // App montata: body non vuoto
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('la route auth è raggiungibile', async ({ page }) => {
    await page.goto('/auth');
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
