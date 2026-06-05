import { type Page, type Locator, expect } from '@playwright/test';
import { CATALOGUE_URL } from '../config';

/**
 * Page Object de l'accueil / catalogue et de son header partagé (#top_page) :
 * lien "Compte", message de bienvenue, email connecté, bouton Panier, déconnexion.
 * Le header étant présent sur toutes les pages, ces locators fonctionnent aussi
 * depuis la page produit ou la page panier.
 */
export class HomePage {
  readonly page: Page;

  /** Lien "Compte" du header (entrée vers la connexion). */
  readonly accountLink: Locator;

  /** Message de bienvenue affiché après une connexion réussie. */
  readonly welcomeMessage: Locator;

  /** Bouton du header affichant l'email connecté (motif générique, pas une adresse en dur). */
  readonly accountEmail: Locator;

  /** Bouton "Panier" du header. Le substring "Panier" matche aussi "Panier (1)", "Panier (2)"... */
  readonly cartButton: Locator;

  /** Lien "Voir le panier" du dropdown panier — présent UNIQUEMENT si le panier n'est pas vide. */
  readonly viewBasketLink: Locator;

  /** Lien "Déconnexion" du menu compte. */
  readonly logoutLink: Locator;

  /** Sélecteur de langue du footer (valeurs : "fr" / "en-gb"), auto-soumis au changement. */
  readonly languageSelect: Locator;

  constructor(page: Page) {
    this.page = page;
    this.accountLink = page.locator('#top_page').getByRole('link', { name: 'Compte' });
    this.welcomeMessage = page.locator('#messages').getByText('Bienvenue');
    this.accountEmail = page.locator('#top_page').getByRole('button', { name: /.+@.+\..+/ });
    this.cartButton = page.locator('#top_page').getByRole('button', { name: 'Panier' });
    this.viewBasketLink = page.locator('#top_page').getByRole('link', { name: 'Voir le panier' });
    this.logoutLink = page.locator('#top_page').getByRole('link', { name: 'Déconnexion' });
    this.languageSelect = page.locator('select[name="language"]');
  }

  /** Navigue vers l'accueil (catalogue). */
  async goto() {
    await this.page.goto(CATALOGUE_URL, { waitUntil: 'domcontentloaded' });
  }

  /** Ouvre la page de connexion en cliquant sur "Compte". */
  async openLogin() {
    await this.accountLink.click();
  }

  /**
   * Ouvre la page panier via le header (clic "Panier" puis "Voir le panier").
   * À n'utiliser que si le panier n'est PAS vide : le lien "Voir le panier"
   * n'apparaît pas dans le dropdown d'un panier vide (sinon : BasketPage.goto()).
   */
  async openBasket() {
    await this.openDropdownThenClick(this.cartButton, this.viewBasketLink);
  }

  /** Déconnecte l'utilisateur (clic sur l'email puis "Déconnexion"). */
  async logout() {
    await this.openDropdownThenClick(this.accountEmail, this.logoutLink);
  }

  /**
   * Garantit que l'interface est en français. Le site peut basculer en en-gb
   * (notamment après une connexion) : on lit le sélecteur de langue du footer et,
   * si on n'est pas en "fr", on bascule (le <select> auto-soumet le formulaire,
   * la page se recharge en français).
   */
  async ensureFrench() {
    if ((await this.languageSelect.inputValue()) !== 'fr') {
      await this.languageSelect.selectOption('fr');
      await expect(this.languageSelect).toHaveValue('fr'); // attend le rechargement
    }
  }

  /**
   * Ouvre un menu déroulant Bootstrap (clic sur `toggle`) puis clique `item`.
   *
   * Robustesse CI : sur un environnement lent, le 1er clic sur le toggle peut
   * arriver AVANT que le JS du dropdown soit attaché -> le menu ne s'ouvre pas, et
   * comme on ne re-clique jamais, l'item n'apparaît jamais (timeout). On attend
   * donc le chargement complet (JS prêt), puis on re-clique le toggle tant que
   * l'item n'est pas visible (garde `isVisible` pour ne pas refermer un menu déjà
   * ouvert et éviter une oscillation).
   */
  private async openDropdownThenClick(toggle: Locator, item: Locator) {
    await this.page.waitForLoadState('load');
    await expect(async () => {
      if (!(await item.isVisible())) {
        await toggle.click();
      }
      await expect(item).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 30000 });
    await item.click();
  }
}
