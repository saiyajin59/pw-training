/**
 * ============================================================================
 * VERSION OPTIMISÉE de cart-persistence.spec.ts — banc d'essai performance.
 * ============================================================================
 * Même scénario fonctionnel (le panier persiste après déconnexion/reconnexion),
 * mais avec toutes les optimisations proposées, pour comparer le temps d'exécution :
 *
 *   #1  Setup via API (login + vidage + ajout) au lieu de l'UI  -> évite 1 login
 *       UI complet + la navigation page produit + la soumission de formulaire.
 *   #2  Langue française forcée (locale fr-FR + Accept-Language + cookie
 *       django_language) -> plus aucun rechargement ensureFrench(), plus de
 *       bascule en-gb (on ne fait d'ailleurs plus de redirection de login UI).
 *   #3  Blocage des ressources lourdes (images, polices, médias) -> chaque page
 *       se charge plus vite (on NE bloque PAS CSS/JS).
 *   #4  Navigations par URL directe -> aucun dropdown (pas de Voir le panier /
 *       Déconnexion / clic Compte), donc pas de waitForLoadState('load')+retries.
 *
 * NB : login/relogin et logout se font ici par API/URL directe (le login UI est
 * déjà couvert par login-success/login-error). Le test reste connecté/déconnecté
 * pour de vrai et vérifie la persistance réelle côté serveur.
 * ============================================================================
 */
import { test, expect } from './fixtures';
import {
  getCredentials,
  BASE_URL,
  CATALOGUE_URL,
} from './config';

// Optimisation #2 : on demande le français au niveau du contexte navigateur.
test.use({ locale: 'fr-FR', extraHTTPHeaders: { 'Accept-Language': 'fr-FR,fr;q=0.9' } });

const LOGIN_API = `${BASE_URL}/api/login/`;
const ADD_PRODUCT_API = `${BASE_URL}/api/basket/add-product/`;
const PRODUCT_API = `${BASE_URL}/api/products/5/`; // i-robot_5
const LOGOUT_URL = `${BASE_URL}/fr/accounts/logout/`;

test('persistance panier — version optimisée (API + ressources bloquées + URLs directes)', async ({
  page,
  basketPage,
}) => {
  test.slow();
  const { email, password } = getCredentials();
  const PRODUIT = 'I, Robot';

  const cartButton = page.locator('#top_page').getByRole('button', { name: 'Panier' });
  const accountEmail = page.locator('#top_page').getByRole('button', { name: /.+@.+\..+/ });

  // Optimisation #2 (bis) : cookie de langue (le préfixe /fr/ + ce cookie garantissent le FR).
  await page.context().addCookies([{ name: 'django_language', value: 'fr', url: BASE_URL }]);

  // Optimisation #3 : bloquer les ressources lourdes (pas le CSS/JS).
  await page.route(
    /\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|mp4|webm|avif)(\?.*)?$/i,
    (route) => route.abort()
  );

  // Petit utilitaire : en-têtes CSRF (token courant + Referer) pour les POST API authentifiés.
  const apiHeaders = async () => {
    const cookies = await page.context().cookies();
    const token = cookies.find((c) => c.name === 'csrftoken')?.value ?? '';
    return { 'X-CSRFToken': token, Referer: `${BASE_URL}/` };
  };

  // ===== SETUP RAPIDE VIA API (#1) =====
  // Login API -> authentifie la session du navigateur (page.request partage les cookies).
  expect((await page.request.post(LOGIN_API, { form: { username: email, password } })).ok()).toBeTruthy();
  // Panier vide (API, plan A Basic) puis ajout de l'article (API).
  await basketPage.emptyViaApi(email, password);
  expect(
    (await page.request.post(ADD_PRODUCT_API, {
      headers: await apiHeaders(),
      data: { url: PRODUCT_API, quantity: 1 },
    })).ok()
  ).toBeTruthy();

  // ===== VÉRIF : connecté + panier (1) + article présent (URLs directes #4) =====
  await page.goto(CATALOGUE_URL, { waitUntil: 'domcontentloaded' });
  await expect(accountEmail).toBeVisible();
  await expect(cartButton).toContainText('(1)');
  await basketPage.goto();
  await expect(basketPage.removeLinks).toHaveCount(1);
  await expect(basketPage.product(PRODUIT)).toBeVisible();

  // ===== DÉCONNEXION (URL directe) =====
  await page.goto(LOGOUT_URL, { waitUntil: 'domcontentloaded' });
  await page.goto(CATALOGUE_URL, { waitUntil: 'domcontentloaded' });
  await expect(cartButton).not.toContainText('('); // compteur sans chiffre
  await basketPage.goto();
  await expect(basketPage.emptyMessage).toBeVisible();
  await expect(basketPage.removeLinks).toHaveCount(0);

  // ===== RECONNEXION (API) + vérif restauration =====
  expect((await page.request.post(LOGIN_API, { form: { username: email, password } })).ok()).toBeTruthy();
  await page.goto(CATALOGUE_URL, { waitUntil: 'domcontentloaded' });
  await expect(cartButton).toContainText('(1)');
  await basketPage.goto();
  await expect(basketPage.removeLinks).toHaveCount(1);
  await expect(basketPage.product(PRODUIT)).toBeVisible();
});
