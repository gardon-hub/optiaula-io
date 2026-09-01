import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de las pruebas de extremo a extremo.
 *
 * Playwright levanta el servidor de desarrollo por su cuenta, así que basta
 * `npm run test:e2e`. La primera vez hace falta instalar el navegador con
 * `npx playwright install chromium`.
 */
export default defineConfig({
  testDir: './pruebas/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: process.env['CI'] ? 'github' : 'list',

  use: {
    baseURL: 'http://localhost:5175',
    locale: 'es-HN',
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    { name: 'telefono', use: { ...devices['Pixel 7'] } },
  ],

  webServer: {
    command: 'npm run dev -- --port 5175',
    url: 'http://localhost:5175',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
