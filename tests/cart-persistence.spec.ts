/**
 * ============================================================================
 * TEST : Persistance du panier après déconnexion puis reconnexion
 * ============================================================================
 *
 * OBJECTIF
 * --------
 * Vérifier qu'un acheteur connecté retrouve son panier intact après s'être
 * déconnecté puis reconnecté (le panier est rattaché au compte utilisateur).
 *
 * SCÉNARIO (numérotation alignée sur les commentaires du code ci-dessous)
 * ----------------------------------------------------------------------
 *   1.    Aller sur le site (déconnecté) et forcer la langue française.
 *   2.    Se connecter (puis re-forcer le français — le login peut basculer en-gb).
 *   3-4.  Vider le panier via l'API REST, puis vérifier qu'il est vide.
 *   5.    Ajouter l'article de test (I, Robot) au panier.
 *   6.    Vérifier que le panier contient l'article (par son TITRE) + 1 ligne.
 *   7.    Se déconnecter (puis re-forcer le français).
 *   8.    Déconnecté : le compteur du panier n'affiche plus de chiffre.
 *   9-10. Dans le panier : il est vide (aucune ligne "Enlever").
 *   11.   Se reconnecter (puis re-forcer le français).
 *   12.   Le compteur du panier affiche de nouveau "(1)".
 *   13-14.Dans le panier : l'article (I, Robot) est de nouveau présent (par titre).
 *
 * POINTS D'ATTENTION (cible = boutique Oscar/Django en fonction serverless)
 * ------------------------------------------------------------------------
 * - GESTION DE LA LANGUE : après un login, le site retombe parfois en anglais
 *   ("Basket" au lieu de "Panier", URLs /en-gb/). homePage.ensureFrench() lit le
 *   sélecteur de langue du footer et bascule sur "fr" si besoin. On l'appelle à
 *   chaque changement d'état (1er accès déco, après login, après logout, après
 *   reconnexion) pour que les libellés français soient toujours présents.
 * - PANIER STATEFUL / COMPTE PARTAGÉ : le test modifie le panier du compte de
 *   test réel. D'où le vidage initial (étape 3) qui garantit la rejouabilité.
 *   NE PAS lancer ce test avec --repeat-each en parallèle (des instances
 *   concurrentes videraient/rempliraient le même panier en même temps).
 * - LENTEUR SERVERLESS : test.slow() (timeout triplé), flux long (2 connexions,
 *   bascules de langue, navigations). Navigation en 'domcontentloaded'.
 *
 * VIDAGE DU PANIER VIA L'API REST (étape 3 → basketPage.emptyViaApi())
 * --------------------------------------------------------------------
 * Plutôt que de cliquer chaque bouton "Enlever" un par un, on vide le panier en
 * un seul appel : DELETE {BASE_URL}/api/basket/ (API oscarapi, montée sur le
 * MÊME host que le site web — pas sur un host séparé).
 *
 * Authentification : on N'UTILISE PAS l'auth Basic, car :
 *   - l'auth Basic cible un panier DIFFÉRENT de celui de la session navigateur ;
 *   - et dès qu'un cookie de session est présent, Django répond 403 (CSRF).
 * À la place, on réutilise la SESSION du navigateur (déjà connecté à l'étape 2) :
 * Playwright `page.request` partage les cookies du contexte, donc la requête est
 * authentifiée comme l'utilisateur connecté et cible LE BON panier — les
 * identifiants sont donc bien gérés, via le login de l'étape 2.
 * Django exige en plus, pour une requête non-sûre (DELETE) en HTTPS :
 *   - l'en-tête X-CSRFToken (valeur lue dans le cookie "csrftoken") ;
 *   - un en-tête Referer pointant vers le site.
 * Réponse de succès attendue : 207 (Multi-Status, renvoyé par oscarapi).
 * (Implémentation détaillée dans tests/pages/BasketPage.ts → emptyViaApi().)
 * ============================================================================
 */
import { test, expect } from './fixtures';
import { getCredentials, PRODUCT_URL } from './config';

test('le panier est conservé après déconnexion puis reconnexion', async ({
  homePage,
  loginPage,
  productPage,
  basketPage,
}) => {
  // Flux long (2 connexions, bascules de langue, vidage, ajout) sur cible serverless lente.
  test.slow();

  const { email, password } = getCredentials();
  const PRODUIT = 'I, Robot';

  // 1. Accès au site (déconnecté) — on s'assure d'être en français.
  await homePage.goto();
  await homePage.ensureFrench();

  // 2. Connexion — puis on re-vérifie la langue (le login peut basculer en en-gb).
  await homePage.openLogin();
  await loginPage.login(email, password);
  await expect(homePage.accountEmail).toBeVisible();
  await homePage.ensureFrench();

  // 3-4. Vider le panier via l'API REST (rapide, pas de clic "Enlever"), puis vérifier.
  await basketPage.emptyViaApi();
  await basketPage.goto();
  await expect(basketPage.removeLinks).toHaveCount(0);
  await expect(basketPage.emptyMessage).toBeVisible();

  // 5. Ajouter l'article de test.
  await productPage.goto(PRODUCT_URL);
  await productPage.addToCart();

  // 6. Vérifier que le panier contient l'article (par son titre).
  await homePage.openBasket();
  await expect(basketPage.removeLinks).toHaveCount(1);
  await expect(basketPage.product(PRODUIT)).toBeVisible();

  // 7. Déconnexion — puis on s'assure d'être en français.
  await homePage.logout();
  await homePage.ensureFrench();

  // 8. Déconnecté : le compteur du panier n'affiche plus de chiffre.
  await expect(homePage.cartButton).not.toContainText('(');

  // 9-10. Dans le panier : il est vide (aucune ligne "Enlever").
  await basketPage.goto();
  await expect(basketPage.removeLinks).toHaveCount(0);
  await expect(basketPage.emptyMessage).toBeVisible();

  // 11. Reconnexion — puis on s'assure d'être en français.
  await homePage.goto();
  await homePage.openLogin();
  await loginPage.login(email, password);
  await expect(homePage.accountEmail).toBeVisible();
  await homePage.ensureFrench();

  // 12. Le compteur du panier affiche (1) : panier restauré.
  await expect(homePage.cartButton).toContainText('(1)');

  // 13-14. Dans le panier : l'article ajouté est de nouveau présent (par son titre).
  await homePage.openBasket();
  await expect(basketPage.removeLinks).toHaveCount(1);
  await expect(basketPage.product(PRODUIT)).toBeVisible();
});
