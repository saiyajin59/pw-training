import { test, expect } from './fixtures';
import { getCredentials } from './config';

test('connexion réussie avec des identifiants valides', async ({ homePage, loginPage }) => {
  const { email, password } = getCredentials();

  await homePage.goto();
  await homePage.openLogin();
  await loginPage.login(email, password);

  // Message de bienvenue
  await expect(homePage.welcomeMessage).toBeVisible();

  // Le header affiche l'email connecté (motif générique, valable pour tout compte)
  await expect(homePage.accountEmail).toBeVisible();
});
