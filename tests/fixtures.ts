import { test as base, expect } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';

type Credentials = {
  email: string;
  password: string;
};

type Fixtures = {
  backend: APIRequestContext;
  credentials: Credentials;
};

export const test = base.extend<Fixtures>({
  backend: async ({ playwright }, use) => {
    const backendBaseUrl = process.env.BE_BASE_URL ?? 'http://localhost:8080';
    const backend = await playwright.request.newContext({
      baseURL: backendBaseUrl,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 30_000,
    });

    await use(backend);

    await backend.dispose();
  },
  credentials: async ({}, use) => {
    await use({
      email: process.env.E2E_USER_EMAIL ?? 'user@test.com',
      password: process.env.E2E_USER_PASSWORD ?? 'password',
    });
  },
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    await use(page);

    await page.context().clearCookies();
  },
});

export { expect };


