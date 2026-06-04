import { test, expect } from '@playwright/test';

const PRODUCT_URL =
  'https://simplecommerce1nz5qlcr-frederic.functions.fnc.fr-par.scw.cloud/fr/catalogue/i-robot_5/';

test.describe('Ajout au panier', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PRODUCT_URL);
  });

  test('le panier est vide, ajout produit, vérification compteur et message de confirmation', async ({
    page,
  }) => {
    // Le bouton Panier (dropdown) ne doit afficher aucun chiffre — juste "Panier"
    const cartButton = page.locator('li.basket-mini a.nav-link');
    await expect(cartButton).toBeVisible();
    await expect(cartButton).toHaveText(/^\s*Panier\s*$/);

    // Ajout au panier
    await page.getByRole('button', { name: 'Ajouter au panier' }).click();

    // Un message de confirmation doit apparaître (le nom du produit peut varier)
    await expect(
      page.getByText('a été ajouté à votre panier.')
    ).toBeVisible();

    // Le compteur du panier doit passer à (1)
    await expect(cartButton).toContainText('(1)');
  });
});
