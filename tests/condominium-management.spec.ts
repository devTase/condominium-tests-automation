import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

test.describe('Condominium management', () => {
  test('create condominium via UI persists to backend', async ({ page, backend, credentials }) => {
    const condominiumName = `Condomínio Playwright ${Date.now()}`;

    await page.goto('/login');

    const apiLoginResponse = await backend.post('/auth/login', {
      data: {
        email: credentials.email,
        password: credentials.password,
      },
    });
    expect(apiLoginResponse.ok()).toBeTruthy();
    const { accessToken } = (await apiLoginResponse.json()) as AuthResponse;

    await page.route('**/condominiums**', async (route) => {
      const headers = {
        ...route.request().headers(),
        Authorization: `Bearer ${accessToken}`,
      };
      await route.continue({ headers });
    });

    await page.getByTestId('login-email-input').fill(credentials.email);
    await page.getByTestId('login-password-input').fill(credentials.password);
    await page.getByTestId('login-submit-button').click();
    await page.waitForResponse((response) => {
      return response.url().endsWith('/auth/login') && response.request().method() === 'POST';
    });
    await expect(page.getByTestId('condominiums-table')).toBeVisible();

    await dismissErrorDialogs(page);

    await page.getByTestId('condominium-list-header').waitFor({ state: 'visible' });

    const createButton = page.getByTestId('create-condominium-button');
    await expect(createButton).toBeEnabled();
    await dismissErrorDialogs(page);
    await createButton.click();

    const dialog = page.locator('mat-dialog-container');
    await expect(dialog).toBeVisible();

    await dialog.getByTestId('condominium-name-input').fill(condominiumName);
    await dialog.getByTestId('condominium-deputy-input').fill('Gestor Playwright');
    await dialog.getByTestId('condominium-address-input').fill('Rua Playwright, 123');
    await dialog.getByTestId('condominium-tax-input').fill('123456789');
    await dialog.getByTestId('condominium-iban-input').fill('PT50000123456789012345678');
    await dialog.getByTestId('condominium-floors-input').fill('3');
    await dialog.getByTestId('condominium-fractions-input').fill('4');

    await dialog.getByRole('tab', { name: 'Finanças' }).click();
    const monthlySubscriptionInput = dialog.getByTestId('condominium-monthly-subscription-input');
    await monthlySubscriptionInput.fill('35');
    await dialog.getByTestId('condominium-debt-input').fill('0');
    await dialog.getByTestId('condominium-bank-balance-input').fill('1000');
    await dialog.getByTestId('condominium-cash-input').fill('200');

    const submitButton = dialog.getByTestId('create-condominium-submit');
    await expect(submitButton).toBeEnabled({ timeout: 10_000 });

    const createResponsePromise = page.waitForResponse((response) => {
      return response.url().endsWith('/condominiums') && response.request().method() === 'POST';
    });

    await submitButton.click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBeTruthy();

    await expect(dialog).toBeHidden({ timeout: 15_000 });

    const condominiumsAfterCreationResponse = await backend.get('/condominiums');
    expect(condominiumsAfterCreationResponse.ok()).toBeTruthy();
    const condominiumsAfterCreation = (await condominiumsAfterCreationResponse.json()) as BackendCondominiumDto[];

    const createdCondominium =
      condominiumsAfterCreation.find(
        (condominium) =>
          condominium.condominium_name === condominiumName ||
          condominium.condominiumName === condominiumName ||
          condominium.deputy_administrator === condominiumName,
      ) ?? null;

    try {
      if (!createdCondominium) {
        test.info().annotations.push({
          type: 'condominiumsAfterCreation',
          description: JSON.stringify(condominiumsAfterCreation, null, 2),
        });
      }
      expect(createdCondominium).not.toBeNull();
    } finally {
      if (createdCondominium?.id) {
        await backend.delete(`/condominiums/${createdCondominium.id}`);
      }
    }
  });
});

type BackendCondominiumDto = {
  id: number;
  condominium_name?: string;
  condominiumName?: string;
  deputy_administrator?: string;
};

type AuthResponse = {
  accessToken: string;
};

async function dismissErrorDialogs(page: Page): Promise<void> {
  const closeButton = page.locator('mat-dialog-container button', { hasText: 'Fechar' });
  while (await closeButton.isVisible()) {
    await closeButton.first().click();
    await closeButton.first().waitFor({ state: 'detached' }).catch(() => {});
  }
}


