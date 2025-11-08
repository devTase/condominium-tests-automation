import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

test.describe('Authentication & Dashboard', () => {
  test('user can login and list condominiums served by the backend', async ({ page, backend, credentials }) => {
    const condominiumsResponse = await backend.get('/condominiums');
    expect(condominiumsResponse.ok()).toBeTruthy();
    const backendCondominiums = (await condominiumsResponse.json()) as BackendCondominiumDto[];

    await page.goto('/login');
    await expect(page).toHaveURL(/\/login$/);

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

    await dismissErrorDialogs(page);
    await expect(page.getByTestId('condominiums-table')).toBeVisible();

    const tableRows = page.getByTestId('condominium-row');
    await expect(tableRows).toHaveCount(backendCondominiums.length);

    const uiNames = await page.getByTestId('condominium-name-cell').allTextContents();
    const normalizedUiNames = uiNames.map(normalizeName);
    const expectedNames = backendCondominiums.map((condominium) => {
      return (
        condominium.condominium_name ??
        condominium.condominiumName ??
        condominium.deputy_administrator ??
        condominium.administrator ??
        ''
      );
    });

    for (const expectedName of expectedNames) {
      if (!expectedName) {
        continue;
      }
      await test.step(`expects condominium "${expectedName}" to be visible in UI list`, async () => {
        expect(normalizedUiNames).toContain(normalizeName(expectedName));
      });
    }

    await test.step('snapshot UI data vs backend data for debugging', async () => {
      test.info().annotations.push({
        type: 'backendCondominiums',
        description: JSON.stringify(backendCondominiums, null, 2),
      });
      test.info().annotations.push({
        type: 'uiCondominiumNames',
        description: JSON.stringify(uiNames, null, 2),
      });
    });
  });
});

type BackendCondominiumDto = {
  id: number;
  condominium_name?: string;
  condominiumName?: string;
  deputy_administrator?: string;
  administrator?: string;
};

type AuthResponse = {
  accessToken: string;
};

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

async function dismissErrorDialogs(page: Page): Promise<void> {
  const closeButton = page.locator('mat-dialog-container button', { hasText: 'Fechar' });
  while (await closeButton.isVisible()) {
    await closeButton.first().click();
    await closeButton.first().waitFor({ state: 'detached' }).catch(() => {});
  }
}

