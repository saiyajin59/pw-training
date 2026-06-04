import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object représentant le formulaire de connexion (#login_form).
 * Tout est scopé au formulaire car la page contient aussi un formulaire
 * d'inscription avec les mêmes libellés.
 */
export class LoginPage {
  readonly page: Page;
  readonly form: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  /** Message d'erreur d'authentification (regex pour tolérer l'apostrophe ' ou ’). */
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.form = page.locator('#login_form');
    this.emailInput = this.form.getByLabel('Adresse électronique');
    this.passwordInput = this.form.getByLabel('Mot de passe');
    this.submitButton = this.form.getByRole('button', { name: 'Connexion' });
    this.errorMessage = this.form.getByText(
      /Saisissez un nom d.utilisateur et un mot de passe valides/
    );
  }

  /** Saisit les identifiants et soumet le formulaire. */
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
