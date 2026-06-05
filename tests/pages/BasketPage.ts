import { type Page, type Locator, expect, request } from '@playwright/test';
import { BASKET_URL, BASKET_API_URL } from '../config';

/**
 * Page Object de la page panier (/fr/basket/).
 */
export class BasketPage {
  readonly page: Page;
  readonly formset: Locator;

  /** Liens "Enlever" — un par article présent dans le panier. */
  readonly removeLinks: Locator;

  /** Message affiché lorsque le panier est vide. */
  readonly emptyMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.formset = page.locator('#basket_formset');
    this.removeLinks = this.formset.getByRole('link', { name: 'Enlever' });
    this.emptyMessage = page.getByText('Votre panier est vide');
  }

  /** Navigue directement vers la page panier (fiable que le panier soit vide ou plein, connecté ou non). */
  async goto() {
    await this.page.goto(BASKET_URL, { waitUntil: 'domcontentloaded' });
  }

  /**
   * Vide le panier via l'API REST (DELETE /api/basket/) — bien plus rapide et
   * fiable que de cliquer chaque "Enlever" un par un. Stratégie à deux niveaux :
   *
   *   PLAN A — appel "simple" en authentification Basic (email:password).
   *     L'appel part d'un contexte API NEUF, SANS les cookies du navigateur.
   *     Sans cookie de session, Django applique l'authentification Basic (et non
   *     la session) -> AUCUN contrôle CSRF requis. C'est l'équivalent direct du
   *     `curl --header 'authorization: Basic ...'`.
   *
   *   VÉRIFICATION — on recharge la page panier et on compte les lignes "Enlever".
   *     Si le panier est vide, le plan A a suffi : on s'arrête là.
   *
   *   PLAN B (repli) — si le panier n'est PAS vide (pour une raison quelconque :
   *     panier ciblé différent, appel rejeté...), on vide via la SESSION du
   *     navigateur. `page.request` partage les cookies du contexte : la requête
   *     est authentifiée comme l'utilisateur connecté et cible le panier de la
   *     session. Django exige alors, pour un DELETE en HTTPS, l'en-tête
   *     X-CSRFToken (valeur du cookie "csrftoken") + un Referer du site.
   *
   * Le code de réponse de chaque appel API est journalisé (console.log) afin de
   * savoir ce qui s'est passé (plan A suffisant, ou bascule sur le plan B).
   *
   * Pré-requis : être connecté (le plan B s'appuie sur la session courante).
   * Réponse de succès attendue de l'API : 207 (Multi-Status, renvoyé par oscarapi).
   */
  async emptyViaApi(email: string, password: string) {
    // --- PLAN A : authentification Basic (appel simple, contexte sans cookies) ---
    let planAResult: number | string;
    try {
      planAResult = await this.deleteBasketWithBasicAuth(email, password);
    } catch (e) {
      planAResult = `exception (${(e as Error).message})`;
    }
    console.log(`[panier] Plan A (auth Basic) -> réponse API : ${planAResult}`);

    // VÉRIFICATION : le panier vu par la session navigateur est-il réellement vide ?
    await this.goto();
    const remaining = await this.removeLinks.count();
    if (remaining === 0) {
      console.log('[panier] Plan A suffisant : panier vide.');
      return;
    }

    // --- PLAN B (repli) : session du navigateur + token CSRF ---
    console.log(
      `[panier] Panier non vide après le plan A (${remaining} article(s)) -> bascule sur le plan B.`
    );
    const planBStatus = await this.deleteBasketWithSessionCsrf();
    console.log(`[panier] Plan B (session + CSRF) -> réponse API : ${planBStatus}`);
    await this.goto();
  }

  /**
   * PLAN A. DELETE /api/basket/ en authentification Basic, depuis un contexte API
   * NEUF (sans les cookies du navigateur) : Django utilise l'auth Basic, pas la
   * session, donc pas de contrôle CSRF. Retourne le code de statut HTTP.
   */
  private async deleteBasketWithBasicAuth(email: string, password: string): Promise<number> {
    const credentials = Buffer.from(`${email}:${password}`).toString('base64');
    const context = await request.newContext();
    try {
      const response = await context.delete(BASKET_API_URL, {
        headers: { Authorization: `Basic ${credentials}` },
      });
      return response.status();
    } finally {
      await context.dispose(); // on libère toujours le contexte créé
    }
  }

  /**
   * PLAN B. DELETE /api/basket/ via la session du navigateur (page.request partage
   * les cookies). Django exige, pour un DELETE en HTTPS authentifié par session,
   * le token CSRF (en-tête X-CSRFToken = cookie "csrftoken") et un Referer du site.
   * Retourne le code de statut HTTP.
   */
  private async deleteBasketWithSessionCsrf(): Promise<number> {
    const cookies = await this.page.context().cookies();
    const csrfToken = cookies.find((c) => c.name === 'csrftoken')?.value ?? '';
    const response = await this.page.request.delete(BASKET_API_URL, {
      headers: { 'X-CSRFToken': csrfToken, Referer: BASKET_URL },
    });
    expect(response.ok()).toBeTruthy(); // 2xx (oscarapi renvoie 207 Multi-Status)
    return response.status();
  }

  /**
   * Locator du titre d'un article dans le panier, par son nom (ex. "I, Robot").
   * Cible le lien à l'intérieur du <h3> du titre — non ambigu (le lien de l'image
   * porte le même nom accessible).
   */
  product(name: string): Locator {
    return this.formset.getByRole('heading', { name }).getByRole('link', { name });
  }
}
