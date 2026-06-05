/**
 * ============================================================================
 * TEST : Frais de livraison selon le montant du panier (MODE INVITÉ)
 * ============================================================================
 * Règle métier : panier >= 30 € -> livraison gratuite ; sinon -> 7,00 € fixe.
 * (Seuil confirmé : 30 € pile = gratuit.)
 *
 * SETUP : un produit à 15 € est créé À LA VOLÉE via l'API admin au début (beforeAll),
 * avec un slug et un SKU UNIQUES (timestamp) à chaque exécution -> jamais de
 * collision/blocage sur un slug déjà existant. C'est CE produit qui est testé,
 * en jouant sur la quantité pour couvrir 3 scénarios :
 *   - 1 × 15 € = 15 € (< 30) -> livraison payante 7,00 €
 *   - 2 × 15 € = 30 € (seuil)-> livraison gratuite 0,00 €
 *   - 3 × 15 € = 45 € (> 30) -> livraison gratuite 0,00 €
 *
 * Optimisations conservées :
 *   - Mode invité (pas de login) ; contexte navigateur neuf par test -> panier vide.
 *   - Exécution EN SÉRIE (la cible serverless ne tient pas les accès concurrents
 *     à froid) ; le produit n'est créé qu'UNE fois (beforeAll) pour les 3 tests.
 *   - Ressources lourdes (images/polices/médias) bloquées (pas le CSS/JS).
 *   - UNE seule navigation par test : on clique "Ajouter au panier" N fois sur la
 *     même page produit (chaque clic recharge la page, le bouton est relocalisé).
 *
 * NB : en invité, l'API add-product ne se reflète pas dans le panier de session
 * -> on ajoute via l'UI. La création de produit, elle, passe par l'API admin
 * (auth Basic superuser, identifiants dans .env / secrets CI).
 * ============================================================================
 */
import { test, expect, request, type Page } from '@playwright/test';
import { BASE_URL, ADMIN_PRODUCTS_API, getAdminCredentials } from './config';

const BASKET = `${BASE_URL}/fr/basket/`;

// URL boutique du produit créé (/fr/catalogue/<slug>_<id>/), renseignée par beforeAll.
let productUrl: string;

/** Ajoute le produit créé au panier invité via l'UI, `quantity` fois (1 navigation). */
async function addCreatedProduct(page: Page, quantity: number) {
  await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
  const addToCart = page.locator('#add_to_basket_form').getByRole('button', { name: 'Ajouter au panier' });
  for (let i = 0; i < quantity; i++) {
    await addToCart.click();
    await page.waitForLoadState('domcontentloaded');
  }
}

test.describe('Frais de livraison (mode invité)', () => {
  // En série : pas d'accès concurrents à la cible serverless (sinon flaky à froid).
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    // Crée un produit à 15 € avec slug + SKU uniques (timestamp) -> jamais de collision.
    const stamp = Date.now();
    const { user, password } = getAdminCredentials();
    const apiContext = await request.newContext();
    try {
      const response = await apiContext.post(ADMIN_PRODUCTS_API, {
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64'),
          'content-type': 'application/json',
        },
        data: {
          name: `Produit livraison ${stamp}`,
          title: `Produit livraison 15€ (${stamp})`,
          slug: `produit-livraison-${stamp}`,
          product_class: 'book',
          stockrecords: [
            {
              partner: '/api/admin/partners/1/',
              partner_sku: `SKU-${stamp}`,
              price_currency: 'EUR',
              price: 15,
              num_in_stock: 100,
            },
          ],
        },
      });
      expect(response.ok()).toBeTruthy();
      const product = await response.json();
      productUrl = `${BASE_URL}/fr/catalogue/${product.slug}_${product.id}/`;
    } finally {
      await apiContext.dispose();
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.route(
      /\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|mp4|webm|avif)(\?.*)?$/i,
      (route) => route.abort()
    );
  });

  test('1 × 15 € = 15 € → livraison payante (7,00 €)', async ({ page }) => {
    await addCreatedProduct(page, 1);
    await page.goto(BASKET, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('tr', { hasText: 'Prix de livraison fixe' })).toContainText('7,00');
  });

  test('2 × 15 € = 30 € → livraison gratuite (seuil exact 30 €)', async ({ page }) => {
    await addCreatedProduct(page, 2);
    await page.goto(BASKET, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('tr', { hasText: 'Total livraison (après réductions)' })).toContainText('0,00');
  });

  test('3 × 15 € = 45 € → livraison gratuite', async ({ page }) => {
    await addCreatedProduct(page, 3);
    await page.goto(BASKET, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('tr', { hasText: 'Total livraison (après réductions)' })).toContainText('0,00');
  });
});
