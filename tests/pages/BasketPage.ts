import { type Page, type Locator, expect } from '@playwright/test';
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
   * fiable que de cliquer chaque "Enlever" un par un.
   *
   * On réutilise la session du navigateur (déjà connecté) que `page.request`
   * partage : c'est donc le BON panier qui est ciblé, et pas besoin d'auth Basic.
   * Django exige, pour les requêtes non-sûres en HTTPS, le token CSRF (cookie
   * `csrftoken` renvoyé dans l'en-tête `X-CSRFToken`) et un `Referer` du site.
   * Pré-requis : être connecté.
   */
  async emptyViaApi() {
    const cookies = await this.page.context().cookies();
    const csrfToken = cookies.find((c) => c.name === 'csrftoken')?.value ?? '';
    const response = await this.page.request.delete(BASKET_API_URL, {
      headers: { 'X-CSRFToken': csrfToken, Referer: BASKET_URL },
    });
    // oscarapi renvoie 207 (Multi-Status) ; ok() couvre toute la plage 2xx.
    expect(response.ok()).toBeTruthy();
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
