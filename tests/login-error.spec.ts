import { test, expect } from './fixtures';

test('échec de connexion avec des identifiants invalides', async ({ homePage, loginPage }) => {
  await homePage.goto();
  await homePage.openLogin();
  await loginPage.login('mauvais@example.com', 'mauvaisMotDePasse');

  // Message d'erreur affiché dans le formulaire
  await expect(loginPage.errorMessage).toBeVisible();
});
