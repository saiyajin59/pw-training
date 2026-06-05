/**
 * Configuration centralisée de la suite (source unique de vérité).
 * - URLs : dérivées d'une BASE_URL unique (surchargeable via la variable d'env BASE_URL).
 * - Identifiants : lus depuis les variables d'environnement (.env, chargé par
 *   playwright.config.ts via dotenv). Voir .env.example.
 */

export const BASE_URL =
  process.env.BASE_URL ??
  'https://simplecommerce1nz5qlcr-frederic.functions.fnc.fr-par.scw.cloud';

export const CATALOGUE_URL = `${BASE_URL}/fr/catalogue/`;
export const PRODUCT_URL = `${BASE_URL}/fr/catalogue/i-robot_5/`;
export const BASKET_URL = `${BASE_URL}/fr/basket/`;
export const BASKET_API_URL = `${BASE_URL}/api/basket/`;
export const ADMIN_PRODUCTS_API = `${BASE_URL}/api/admin/products/`;

/**
 * Identifiants d'un compte de test valide, lus à l'exécution depuis l'environnement.
 * Lecture paresseuse : l'erreur n'est levée que si un test en a réellement besoin
 * (les tests sans authentification ne sont pas bloqués par un .env manquant).
 */
export function getCredentials() {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'Identifiants manquants : définis TEST_USER_EMAIL et TEST_USER_PASSWORD ' +
        'dans un fichier .env (voir .env.example).'
    );
  }
  return { email, password };
}

/**
 * Identifiants admin (superuser) pour l'API d'administration (ex. création de
 * produits), lus depuis l'environnement. Voir .env.example.
 */
export function getAdminCredentials() {
  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;
  if (!user || !password) {
    throw new Error(
      'Identifiants admin manquants : définis ADMIN_USER et ADMIN_PASSWORD ' +
        'dans un fichier .env (voir .env.example).'
    );
  }
  return { user, password };
}
