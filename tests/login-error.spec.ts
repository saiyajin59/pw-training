import { test, expect } from '@playwright/test';

const CATALOGUE_URL =
  'https://simplecommerce1nz5qlcr-frederic.functions.fnc.fr-par.scw.cloud/fr/catalogue/';

test('échec de connexion avec des identifiants invalides', async ({ page }) => {
  await page.goto(CATALOGUE_URL, { waitUntil: 'domcontentloaded' });

  // Clic "Compte" — scopé à #top_page (le lien existe en double : nav responsive)
  await page.locator('#top_page').getByRole('link', { name: 'Compte' }).click();

  // Saisie d'identifiants volontairement invalides
  const loginForm = page.locator('#login_form');
  await loginForm.getByLabel('Adresse électronique').fill('mauvais@example.com');
  await loginForm.getByLabel('Mot de passe').fill('mauvaisMotDePasse');
  await loginForm.getByRole('button', { name: 'Connexion' }).click();

  // Message d'erreur dans le formulaire — regex pour tolérer l'apostrophe (' ou ’)
  await expect(
    loginForm.getByText(/Saisissez un nom d.utilisateur et un mot de passe valides/)
  ).toBeVisible();
});
