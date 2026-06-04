import { test, expect } from '@playwright/test';

const CATALOGUE_URL =
  'https://simplecommerce1nz5qlcr-frederic.functions.fnc.fr-par.scw.cloud/fr/catalogue/';

// Identifiants valides (dans un vrai projet : à externaliser en variables d'environnement)
const EMAIL = 'saiyajin59@hotmail.com';
const PASSWORD = 'Azerty59000';

test('connexion réussie avec des identifiants valides', async ({ page }) => {
  // Site serverless : on n'attend que le DOM, les assertions web-first patienteront.
  await page.goto(CATALOGUE_URL, { waitUntil: 'domcontentloaded' });

  // Clic "Compte" — scopé à #top_page (le lien existe en double : nav responsive)
  await page.locator('#top_page').getByRole('link', { name: 'Compte' }).click();

  // Champs scopés à #login_form (la page contient aussi un formulaire d'inscription
  // avec les mêmes libellés). getByLabel = libellé du champ.
  const loginForm = page.locator('#login_form');
  await loginForm.getByLabel('Adresse électronique').fill(EMAIL);
  await loginForm.getByLabel('Mot de passe').fill(PASSWORD);
  await loginForm.getByRole('button', { name: 'Connexion' }).click();

  // Message de bienvenue
  await expect(page.locator('#messages').getByText('Bienvenue')).toBeVisible();

  // Le header affiche l'email connecté — on vérifie un motif d'email générique
  // (pas l'adresse en dur) pour que le test reste valable avec d'autres comptes
  await expect(
    page.locator('#top_page').getByRole('button', { name: /.+@.+\..+/ })
  ).toBeVisible();
});
