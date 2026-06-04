import { test as base } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { ProductPage } from './pages/ProductPage';

/**
 * Fixtures custom : chaque Page Object est instancié automatiquement et injecté
 * dans les tests qui le déclarent en argument. Plus besoin de `new XxxPage(page)`.
 *
 * Contrat : les fixtures retournent des Page Objects NON-navigués. Chaque test
 * (ou son beforeEach) doit appeler `goto()` / `openLogin()` avant d'interagir.
 * Ce choix est délibéré : il laisse les tests piloter la navigation et permet
 * des URLs fixes (HomePage) comme variables (ProductPage.goto(url)).
 *
 * Usage :
 *   import { test, expect } from './fixtures';
 *   test('...', async ({ homePage, loginPage }) => { ... });
 */
type Pages = {
  homePage: HomePage;
  loginPage: LoginPage;
  productPage: ProductPage;
};

export const test = base.extend<Pages>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  productPage: async ({ page }, use) => {
    await use(new ProductPage(page));
  },
});

export { expect } from '@playwright/test';
