import { type Page, type Locator } from '@playwright/test';
import { CATALOGUE_URL } from '../config';

/**
 * Page Object représentant l'accueil / catalogue et son header partagé
 * (lien "Compte", message de bienvenue, email de l'utilisateur connecté).
 */
export class HomePage {
  readonly page: Page;

  /** Lien "Compte" du header — scopé à #top_page (doublon dans la nav responsive). */
  readonly accountLink: Locator;

  /** Message de bienvenue affiché après une connexion réussie. */
  readonly welcomeMessage: Locator;

  /** Bouton du header affichant l'email connecté (motif générique, pas une adresse en dur). */
  readonly accountEmail: Locator;

  constructor(page: Page) {
    this.page = page;
    this.accountLink = page.locator('#top_page').getByRole('link', { name: 'Compte' });
    this.welcomeMessage = page.locator('#messages').getByText('Bienvenue');
    this.accountEmail = page.locator('#top_page').getByRole('button', { name: /.+@.+\..+/ });
  }

  /** Navigue vers l'accueil (catalogue). */
  async goto() {
    await this.page.goto(CATALOGUE_URL, { waitUntil: 'domcontentloaded' });
  }

  /** Ouvre la page de connexion en cliquant sur "Compte". */
  async openLogin() {
    await this.accountLink.click();
  }
}
