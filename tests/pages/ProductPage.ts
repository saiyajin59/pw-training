import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object représentant une page produit (ex. /fr/catalogue/i-robot_5/).
 * Centralise les locators et les actions ; les assertions restent dans le test.
 */
export class ProductPage {
  readonly page: Page;

  /** Bouton "Panier" du header (dropdown) — scopé pour éviter le doublon de la nav responsive. */
  readonly cartButton: Locator;

  /** Bouton "Ajouter au panier" de la fiche produit. */
  readonly addToCartButton: Locator;

  /** Message de confirmation affiché après l'ajout (le nom du produit peut varier). */
  readonly confirmationMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cartButton = page.locator('li.basket-mini a.nav-link');
    this.addToCartButton = page.getByRole('button', { name: 'Ajouter au panier' });
    this.confirmationMessage = page.getByText('a été ajouté à votre panier.');
  }

  /** Navigue vers l'URL d'un produit. */
  async goto(url: string) {
    await this.page.goto(url);
  }

  /** Ajoute le produit courant au panier. */
  async addToCart() {
    await this.addToCartButton.click();
  }
}
