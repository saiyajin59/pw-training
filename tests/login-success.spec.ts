import { test, expect } from './fixtures';
import { getCredentials } from './config';

test('connexion réussie avec des identifiants valides', async ({ homePage, loginPage }) => {
  const { email, password } = getCredentials();

  await homePage.goto();
  await homePage.openLogin();
  await loginPage.login(email, password);

  // Le compte (superuser) atterrit sur le dashboard après un login UI : le
  // message de bienvenue y est affiché.
  await expect(homePage.welcomeMessage).toBeVisible();

  // On revient sur la boutique pour vérifier le header (email connecté).
  await homePage.goto();
  await expect(homePage.accountEmail).toBeVisible();
});
