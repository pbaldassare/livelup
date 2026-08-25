import type { Locator, Page } from '@playwright/test';

// =====================================================
// AUTH FLOWS — helper riutilizzabili per signup/login UI
// e per i gate di onboarding (RequireUserName, PT wizard).
// =====================================================

/**
 * `locator.isVisible()` non attende — verifica solo lo stato attuale.
 * Per i controlli "opzionali" (un gate che potrebbe apparire in modo
 * asincrono) usiamo invece `waitFor({ state: 'visible' })`, che attende
 * fino al timeout e si risolve `false` se l'elemento non compare mai.
 */
export async function waitVisible(locator: Locator, timeoutMs: number): Promise<boolean> {
  return locator
    .first()
    .waitFor({ state: 'visible', timeout: timeoutMs })
    .then(() => true)
    .catch(() => false);
}

export interface SignupOptions {
  email: string;
  password: string;
  role: 'pt' | 'atleta';
}

/** Registra un nuovo utente tramite il form pubblico /auth. */
export async function signupViaUI(page: Page, { email, password, role }: SignupOptions): Promise<void> {
  await page.goto('/auth');
  await page.getByRole('tab', { name: 'Registrati' }).click();
  await page.locator(role === 'pt' ? 'label[for="role-pt"]' : 'label[for="role-atleta"]').click();
  await page.fill('#signup-email', email);
  await page.fill('#signup-password', password);
  await page.fill('#signup-confirm-password', password);
  await page.getByRole('button', { name: /Registrati come/i }).click();

  const successLocator = page.getByText('Registrazione completata');
  const errorLocator = page.getByText(/Errore di registrazione|Utente già registrato/);

  const outcome = await Promise.race([
    successLocator.waitFor({ state: 'visible', timeout: 30_000 }).then(() => 'success' as const),
    errorLocator.waitFor({ state: 'visible', timeout: 30_000 }).then(() => 'error' as const),
  ]).catch(() => 'timeout' as const);

  if (outcome === 'error') {
    const description = await page
      .locator('[data-description]')
      .first()
      .textContent()
      .catch(() => null);
    throw new Error(`Registrazione fallita lato UI: ${description ?? '(nessun dettaglio toast)'}`);
  }
  if (outcome === 'timeout') {
    throw new Error('Registrazione: nessun toast di successo/errore comparso entro 30s');
  }
}

export interface LoginRetryOptions {
  attempts?: number;
  delayMs?: number;
  /**
   * Timeout per singolo tentativo di attesa del redirect post-login.
   * La risoluzione del ruolo (RPC `get_my_role` + eventuali fallback) può
   * richiedere più di qualche secondo sotto carico: un timeout troppo
   * stretto qui produce falsi negativi (login riuscito lato Supabase ma
   * segnalato come tentativo fallito perché il redirect non è ancora
   * avvenuto).
   */
  successTimeoutMs?: number;
}

/**
 * Effettua login con retry — usato dopo la registrazione PT in attesa che
 * l'agente confermi l'email via Lovable MCP query_database in parallelo.
 */
export async function loginWithRetry(
  page: Page,
  email: string,
  password: string,
  opts: LoginRetryOptions = {},
): Promise<boolean> {
  const attempts = opts.attempts ?? 20;
  const delayMs = opts.delayMs ?? 4000;
  const successTimeoutMs = opts.successTimeoutMs ?? 16_000;

  for (let i = 0; i < attempts; i++) {
    await page.goto('/auth');
    await page.fill('#login-email', email);
    await page.fill('#login-password', password);
    await page.getByRole('button', { name: 'Accedi' }).click();

    const success = await page
      .waitForURL(/\/(pt|app)(\/|\?|$)/, { timeout: successTimeoutMs })
      .then(() => true)
      .catch(() => false);

    if (success) {
      await dismissWelcomeTourIfPresent(page);
      return true;
    }

    // eslint-disable-next-line no-console
    console.log(`[SIM] login attempt ${i + 1}/${attempts} non riuscito, retry in ${delayMs}ms...`);
    await page.waitForTimeout(delayMs);
  }
  return false;
}

/**
 * Il primo accesso di un utente mostra un dialog "Benvenuto su Livelapp!"
 * (tour guidato) che blocca ogni click sottostante finché non viene chiuso.
 * Lo dismissiamo sempre selezionando "Non mostrare più" così il flag viene
 * persistito lato DB e non si ripresenta nelle sessioni/contesti successivi.
 */
export async function dismissWelcomeTourIfPresent(page: Page): Promise<boolean> {
  const heading = page.getByText('Benvenuto su Livelapp!');
  const present = await waitVisible(heading, 2500);
  if (!present) return false;

  await page.getByRole('button', { name: 'Non mostrare più' }).click();
  await heading.waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
  return true;
}

/** Se compare il gate "Completa il profilo" (RequireUserName), lo compila. */
export async function completeUserNameGateIfPresent(
  page: Page,
  firstName: string,
  lastName: string,
): Promise<boolean> {
  const heading = page.getByText('Completa il profilo');
  const present = await waitVisible(heading, 4000);
  if (!present) return false;

  await page.fill('#first_name', firstName);
  await page.fill('#last_name', lastName);
  await page.getByRole('button', { name: 'Continua' }).click();
  await heading.waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {});
  return true;
}

/**
 * Se il nuovo PT viene reindirizzato al wizard /pt/onboarding, lo completa.
 * Il redirect (pt_profiles.status === 'registrato') dipende da una query
 * asincrona lato client: attendiamo qualche istante prima di concludere che
 * il wizard non è previsto.
 */
export async function completePTOnboardingIfPresent(
  page: Page,
  firstName: string,
  lastName: string,
): Promise<boolean> {
  let onOnboarding = false;
  for (let i = 0; i < 12; i++) {
    if (page.url().includes('/pt/onboarding')) {
      onOnboarding = true;
      break;
    }
    await page.waitForTimeout(500);
  }
  if (!onOnboarding) return false;

  await dismissWelcomeTourIfPresent(page);

  // Step 1 — dati personali
  // NOTA: le <Label> di questo wizard non hanno `htmlFor` collegato agli
  // <Input> (nessun `id`), quindi `getByLabel` non funziona: usiamo i
  // placeholder ("Mario" / "Rossi") come selettore stabile.
  await page.getByPlaceholder('Mario').fill(firstName);
  await page.getByPlaceholder('Rossi').fill(lastName);
  await dismissWelcomeTourIfPresent(page);
  await page.getByRole('button', { name: 'Continua' }).click();

  // Step 2 — specializzazioni (almeno una richiesta per proseguire)
  await dismissWelcomeTourIfPresent(page);
  await page.getByText('Calisthenics', { exact: true }).click();
  await page.getByRole('button', { name: 'Continua' }).click();

  // Step 3 — dove lavori (tutti i campi opzionali)
  await dismissWelcomeTourIfPresent(page);
  await page.getByRole('button', { name: 'Continua' }).click();

  // Step 4 — tariffa + completamento
  await dismissWelcomeTourIfPresent(page);
  await page.getByRole('button', { name: /Completa profilo/i }).click();
  await page.waitForURL(/\/pt\/app/, { timeout: 15_000 }).catch(() => {});
  await dismissWelcomeTourIfPresent(page);
  return true;
}
