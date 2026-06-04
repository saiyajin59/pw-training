import { test, expect } from './fixtures';
import { PRODUCT_URL } from './config';

test.describe('Ajout au panier', () => {
  test.beforeEach(async ({ productPage }) => {
    await productPage.goto(PRODUCT_URL);
  });

  test('le panier est vide, ajout produit, vérification compteur et message de confirmation', async ({
    productPage,
  }) => {
    // Le bouton Panier ne doit afficher aucun chiffre — juste "Panier"
    await expect(productPage.cartButton).toBeVisible();
    await expect(productPage.cartButton).toHaveText(/^\s*Panier\s*$/);

    // Ajout au panier
    await productPage.addToCart();

    // Un message de confirmation doit apparaître (le nom du produit peut varier)
    await expect(productPage.confirmationMessage).toBeVisible();

    // Le compteur du panier doit passer à (1)
    await expect(productPage.cartButton).toContainText('(1)');
  });
});
