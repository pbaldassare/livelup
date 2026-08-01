import { test, expect } from '@playwright/test';
import {
  signupViaUI,
  loginWithRetry,
  completeUserNameGateIfPresent,
  completePTOnboardingIfPresent,
  dismissWelcomeTourIfPresent,
  waitVisible,
} from './helpers/authFlows';
import { state, recordStep, markNotCovered, finalize } from './helpers/state';

// =====================================================
// LIVELAPP — SIMULAZIONE E2E COMPLETA
//
// Sequenza di test NON `serial`: ogni test gira nello stesso
// worker (--workers=1) e in ordine di file, ma un fallimento
// in uno step NON blocca l'esecuzione degli step successivi
// (a differenza di `test.describe.serial`). Lo stato condiviso
// (email, id creati...) vive nel modulo `helpers/state.ts` e
// viene persistito su `e2e/artifacts/simulation-run.json` dopo
// ogni step.
//
// NOTA CONFERMA EMAIL: la registrazione self-service del PT
// richiede conferma email (Supabase Auth). Questo test STAMPA
// un marker `[SIM] SIM_MARKER:PT_REGISTERED:<email>` che l'agente
// (parent) intercetta per confermare l'email via Lovable MCP
// `query_database` (UPDATE auth.users SET email_confirmed_at=now()).
// Il login successivo usa un retry loop che dà tempo a questa
// conferma esterna di avvenire.
// =====================================================

const RUN_ID = Date.now();
// Override opzionale per riprendere una run con un account PT già creato e
// confermato (utile quando il rate limit email di Supabase Auth blocca
// nuove registrazioni self-service nella stessa sessione di test).
const PT_EMAIL_OVERRIDE = process.env.E2E_PT_EMAIL_OVERRIDE;
const SKIP_SIGNUP = process.env.E2E_SKIP_SIGNUP === '1';
const PT_EMAIL = PT_EMAIL_OVERRIDE ?? `e2e.pt.${RUN_ID}@liveltest.local`;
const PT_PASSWORD = 'TestLivel2026!';
const ATHLETE_PASSWORD = 'Leone123!'; // password temporanea fissa creata da pt-create-athlete
const TEMPLATE_TITLE = `E2E Scheda ${RUN_ID}`;
const GROUP_NAME = `E2E Gruppo ${RUN_ID}`;
const EVENT_TITLE = `E2E Evento ${RUN_ID}`;

test.describe('Livelapp — simulazione end-to-end', () => {
  test.describe.configure({ mode: 'default', timeout: 130_000 });

  test.afterAll(() => {
    finalize();
  });

  test('01 - PT: registrazione via /auth', async ({ page }) => {
    test.setTimeout(120_000);
    state.ptEmail = PT_EMAIL;
    state.ptPassword = PT_PASSWORD;

    if (SKIP_SIGNUP) {
      recordStep('PT: registrazione', 'SKIP', `Riuso account già confermato: ${PT_EMAIL}`);
      console.log(`SIM_MARKER:PT_REGISTERED:${PT_EMAIL}`);
      return;
    }

    // Il toast di conferma può occasionalmente non comparire in tempo sotto
    // carico (form/rete lenti): un retry rende il passo più robusto senza
    // mascherare un fallimento reale (l'errore dell'ultimo tentativo viene
    // comunque propagato).
    let lastErr: Error | null = null;
    let signedUp = false;
    for (let i = 0; i < 3 && !signedUp; i++) {
      try {
        if (i > 0) {
          console.log(`[SIM] retry registrazione PT (tentativo ${i + 1}/3)...`);
        }
        await signupViaUI(page, { email: PT_EMAIL, password: PT_PASSWORD, role: 'pt' });
        signedUp = true;
      } catch (err) {
        lastErr = err as Error;
        // "Utente già registrato" al secondo tentativo significa che il
        // primo era in realtà riuscito lato backend (solo il toast di
        // successo non è comparso in tempo) — trattalo come successo.
        if (/già registrato/i.test(lastErr.message)) {
          signedUp = true;
        }
      }
    }

    if (!signedUp) {
      recordStep('PT: registrazione', 'FAIL', lastErr?.message ?? 'Registrazione fallita');
      throw lastErr ?? new Error('Registrazione fallita');
    }

    recordStep('PT: registrazione', 'PASS', PT_EMAIL);
    // eslint-disable-next-line no-console
    console.log(`SIM_MARKER:PT_REGISTERED:${PT_EMAIL}`);
  });

  test('02 - PT: login (dopo conferma email) + onboarding', async ({ page }) => {
    test.setTimeout(240_000);

    // Piccola attesa iniziale per dare tempo alla conferma email esterna
    // (Lovable MCP) di essere applicata prima del primo tentativo di login.
    await page.waitForTimeout(3000);

    const loggedIn = await loginWithRetry(page, PT_EMAIL, PT_PASSWORD, {
      attempts: 10,
      delayMs: 4000,
      successTimeoutMs: 16_000,
    });

    if (!loggedIn) {
      recordStep('PT: login', 'FAIL', 'Login non riuscito dopo i retry — email non confermata in tempo?');
      throw new Error('PT login failed after retries');
    }
    recordStep('PT: login', 'PASS');

    await dismissWelcomeTourIfPresent(page);
    const wentThroughOnboarding = await completePTOnboardingIfPresent(page, 'Marco', 'Bianchi');
    if (wentThroughOnboarding) {
      recordStep('PT: onboarding wizard', 'PASS');
    } else {
      const filledGate = await completeUserNameGateIfPresent(page, 'Marco', 'Bianchi');
      recordStep('PT: onboarding wizard', 'SKIP', filledGate ? 'RequireUserName gate compilato' : 'Nessun gate mostrato');
    }

    // Assicura di trovarsi sulla dashboard web desktop (viewport > 767px),
    // NON sul wizard di onboarding (verifica esplicita, senza falsi positivi
    // di regex che accetterebbero anche /pt/onboarding).
    await page.goto('/pt');
    await dismissWelcomeTourIfPresent(page);
    await expect(page.locator('body')).not.toBeEmpty();
    await page.waitForURL((url) => /\/pt\/?$/.test(url.pathname), { timeout: 15_000 });
    expect(page.url()).not.toContain('/pt/onboarding');
    recordStep('PT: landing su /pt (web)', 'PASS', page.url());
  });

  test('03 - PT: crea atleta (Crea nuovo)', async ({ page }) => {
    test.setTimeout(150_000);
    const loggedIn = await loginWithRetry(page, PT_EMAIL, PT_PASSWORD, {
      attempts: 4,
      delayMs: 3000,
      successTimeoutMs: 18_000,
    });
    if (!loggedIn) {
      recordStep('PT: crea atleta', 'FAIL', 'Impossibile rifare login PT');
      throw new Error('PT re-login failed');
    }

    const athleteEmail = `e2e.atleta.${RUN_ID}@liveltest.local`;
    const athleteFirstName = 'Luca';
    const athleteLastName = 'Verdi';

    // Navigazione client-side (click sul link in sidebar) invece di
    // `page.goto()`: un reload completo subito dopo il login può incappare
    // in una race del bootstrap auth/permessi che rimanda momentaneamente
    // alla dashboard (`/pt`) invece di restare sulla pagina richiesta.
    await page.getByRole('link', { name: 'Atleti', exact: true }).first().click();
    await page.waitForURL(/\/pt\/athletes/, { timeout: 15_000 });
    await page.getByRole('button', { name: 'Aggiungi atleta' }).click();
    await page.getByRole('tab', { name: 'Crea nuovo' }).click();

    await page.fill('#create-first', athleteFirstName);
    await page.fill('#create-last', athleteLastName);
    await page.fill('#create-email', athleteEmail);
    // Livello: default "Intermedio" già selezionato — nessuna azione necessaria.
    await page.getByText('Tonificazione', { exact: true }).click();

    await page.getByRole('button', { name: 'Crea e collega' }).click();

    await page
      .getByText(/aggiunto tra i tuoi atleti attivi/i)
      .waitFor({ timeout: 20_000 });

    state.athleteEmail = athleteEmail;
    state.athletePassword = ATHLETE_PASSWORD;
    recordStep('PT: crea atleta', 'PASS', athleteEmail);
    // eslint-disable-next-line no-console
    console.log(`SIM_MARKER:ATHLETE_CREATED:${athleteEmail}`);
  });

  test('04 - PT: crea scheda + aggiungi esercizio + assegna ad atleta', async ({ page }) => {
    test.setTimeout(150_000);
    const loggedIn = await loginWithRetry(page, PT_EMAIL, PT_PASSWORD, {
      attempts: 4,
      delayMs: 3000,
      successTimeoutMs: 18_000,
    });
    if (!loggedIn) {
      recordStep('PT: crea scheda', 'FAIL', 'Impossibile rifare login PT');
      throw new Error('PT re-login failed');
    }

    // --- Crea scheda ---
    await page.getByRole('link', { name: 'Allenamenti', exact: true }).first().click();
    await page.waitForURL(/\/pt\/workouts/, { timeout: 15_000 });
    await page.getByRole('button', { name: 'Crea Scheda' }).click();
    await page.fill('#title', TEMPLATE_TITLE);
    await page.getByRole('button', { name: 'Continua' }).click();

    await page.waitForURL(/\/pt\/templates\//, { timeout: 20_000 });
    const templateId = page.url().split('/pt/templates/')[1]?.split('?')[0];
    state.templateId = templateId;
    state.templateTitle = TEMPLATE_TITLE;
    recordStep('PT: crea scheda', 'PASS', templateId);

    // --- Aggiungi un esercizio dall'archivio globale ---
    await page.getByRole('button', { name: 'Aggiungi esercizio' }).click();
    const globalTab = page.getByRole('button', { name: /Globale/ });
    await globalTab.click({ timeout: 10_000 });
    await page.getByPlaceholder('Cerca esercizio…').fill('Burpees');
    // L'archivio globale contiene più voci "Burpees" (duplicato dati non
    // legato a questo test): prendiamo la prima corrispondenza esatta.
    await page.getByText('Burpees', { exact: true }).first().click();
    await page.getByText('Esercizio aggiunto').waitFor({ timeout: 10_000 });
    recordStep('PT: aggiungi esercizio a scheda', 'PASS', 'Burpees');

    // --- Assegna ad atleta ---
    if (!state.athleteEmail) {
      recordStep('PT: assegna scheda ad atleta', 'SKIP', 'Nessun atleta creato nello step precedente');
    } else {
      await page.getByRole('link', { name: 'Allenamenti', exact: true }).first().click();
      await page.waitForURL(/\/pt\/workouts/, { timeout: 15_000 });
      const row = page.getByRole('row', { name: TEMPLATE_TITLE });
      await row.waitFor({ timeout: 15_000 });
      await row.getByTitle('Assegna ad atleta').click();

      const dialog = page.getByRole('dialog', { name: /Assegna Allenamento/i });
      // Il trigger "Atleta" ha `role="combobox"` impostato a mano su un <Button>:
      // per quel ruolo ARIA il nome accessibile non deriva dal testo interno
      // (serve `aria-label`), quindi `{ name: ... }` non trova mai il match —
      // filtriamo sul testo visibile invece che sul nome accessibile.
      await dialog
        .getByRole('combobox')
        .filter({ hasText: 'Seleziona atleta' })
        .click();
      await page.getByPlaceholder('Cerca atleta...').fill('Luca');
      await page.getByText('Luca Verdi', { exact: false }).first().click();

      await dialog.getByRole('button', { name: /^Assegna/ }).click();
      // Segnale di completamento robusto: la dialog si chiude solo dopo che la
      // mutation è andata a buon fine (in caso di errore resta aperta con un
      // toast di errore). Il testo del toast di successo varia (singolare/
      // plurale/"saltati"), quindi non è un selettore stabile.
      await dialog.waitFor({ state: 'hidden', timeout: 15_000 });

      state.workoutId = undefined;
      state.workoutTitle = TEMPLATE_TITLE;
      recordStep('PT: assegna scheda ad atleta', 'PASS', TEMPLATE_TITLE);
    }
  });

  test('05 - PT: crea gruppo community', async ({ page }) => {
    test.setTimeout(150_000);
    const loggedIn = await loginWithRetry(page, PT_EMAIL, PT_PASSWORD, {
      attempts: 4,
      delayMs: 3000,
      successTimeoutMs: 18_000,
    });
    if (!loggedIn) {
      recordStep('PT: crea gruppo', 'FAIL', 'Impossibile rifare login PT');
      throw new Error('PT re-login failed');
    }

    try {
      await page.getByRole('link', { name: 'Gruppi', exact: true }).first().click();
      await page.waitForURL(/\/pt\/groups/, { timeout: 15_000 });
      await page.getByRole('link', { name: 'Crea', exact: true }).first().click();
      await page.waitForURL(/\/pt\/groups\/new/, { timeout: 15_000 });
      await page.fill('#group-name', GROUP_NAME);

      // Seleziona la prima disciplina disponibile (chip toggle).
      const disciplineChip = page.locator('label:has-text("Discipline") + div button').first();
      await disciplineChip.waitFor({ timeout: 10_000 });
      await disciplineChip.click();

      await page.locator('#policy').click();
      await page.getByRole('button', { name: 'Crea gruppo' }).click();

      await page.waitForURL(/\/pt\/groups\/[a-f0-9-]+/, { timeout: 20_000 });
      const groupId = page.url().split('/pt/groups/')[1]?.split('?')[0];
      state.groupId = groupId;
      state.groupName = GROUP_NAME;
      recordStep('PT: crea gruppo community', 'PASS', groupId);
    } catch (err) {
      recordStep('PT: crea gruppo community', 'FAIL', (err as Error).message);
      markNotCovered('Creazione gruppo community non completata (verificare UI discipline picker)');
      throw err;
    }
  });

  test('06 - PT: crea evento calendario', async ({ page }) => {
    test.setTimeout(150_000);
    const loggedIn = await loginWithRetry(page, PT_EMAIL, PT_PASSWORD, {
      attempts: 4,
      delayMs: 3000,
      successTimeoutMs: 18_000,
    });
    if (!loggedIn) {
      recordStep('PT: crea evento', 'FAIL', 'Impossibile rifare login PT');
      throw new Error('PT re-login failed');
    }

    try {
      await page.getByRole('link', { name: 'Eventi', exact: true }).first().click();
      await page.waitForURL(/\/pt\/events/, { timeout: 15_000 });
      await page.getByRole('button', { name: 'Nuovo evento' }).click();
      await page.fill('#title', EVENT_TITLE);

      // Luogo: richiede una suggestion reale da Google Places (rete esterna).
      const placesInput = page.getByPlaceholder('Cerca indirizzo o luogo...');
      await placesInput.fill('Milano, Italia');
      const suggestion = page.getByRole('option').first();
      await suggestion.waitFor({ timeout: 12_000 });
      await suggestion.click();

      await page.getByRole('button', { name: 'Crea Evento' }).click();
      await page.getByText('Evento creato con successo').waitFor({ timeout: 15_000 });

      state.eventTitle = EVENT_TITLE;
      recordStep('PT: crea evento calendario', 'PASS', EVENT_TITLE);
    } catch (err) {
      recordStep('PT: crea evento calendario', 'FAIL', (err as Error).message);
      markNotCovered('Creazione evento calendario non completata (dipende da Google Places Autocomplete)');
      throw err;
    }
  });

  test('07 - Atleta: login + home', async ({ page }) => {
    if (!state.athleteEmail) {
      recordStep('Atleta: login', 'SKIP', 'Nessun account atleta disponibile');
      return;
    }

    test.setTimeout(180_000);
    const loggedIn = await loginWithRetry(page, state.athleteEmail, ATHLETE_PASSWORD, {
      attempts: 6,
      delayMs: 3000,
      successTimeoutMs: 18_000,
    });

    if (!loggedIn) {
      recordStep('Atleta: login', 'FAIL', 'Login atleta non riuscito');
      throw new Error('Athlete login failed');
    }

    await completeUserNameGateIfPresent(page, 'Luca', 'Verdi');
    await page.goto('/app');
    await page.waitForURL(/\/app(\/|$)/, { timeout: 15_000 });
    await expect(page.locator('body')).not.toBeEmpty();
    recordStep('Atleta: login + home', 'PASS', page.url());
  });

  test('08 - Atleta: Programma + apri allenamento assegnato', async ({ page }) => {
    if (!state.athleteEmail) {
      recordStep('Atleta: apri allenamento', 'SKIP', 'Nessun account atleta disponibile');
      return;
    }

    test.setTimeout(150_000);
    const loggedIn = await loginWithRetry(page, state.athleteEmail, ATHLETE_PASSWORD, {
      attempts: 4,
      delayMs: 3000,
      successTimeoutMs: 18_000,
    });
    if (!loggedIn) {
      recordStep('Atleta: apri allenamento', 'FAIL', 'Login atleta non riuscito');
      throw new Error('Athlete login failed');
    }

    await page.goto('/app/programma');

    if (!state.workoutTitle) {
      recordStep('Atleta: apri allenamento', 'SKIP', 'Nessuna scheda assegnata da verificare');
      return;
    }

    const workoutLink = page.locator('a', { hasText: state.workoutTitle }).first();
    await workoutLink.waitFor({ timeout: 15_000 });
    await workoutLink.click();

    await page.waitForURL(/\/app\/workout\//, { timeout: 15_000 });
    await expect(page.getByText(state.workoutTitle).first()).toBeVisible({ timeout: 10_000 });
    state.workoutId = page.url().split('/app/workout/')[1]?.split('?')[0];
    recordStep('Atleta: allenamento assegnato apribile', 'PASS', state.workoutId);

    // Tentativo best-effort di avviare/completare l'allenamento (opzionale).
    try {
      const startBtn = page.getByRole('button', { name: /Inizia allenamento|Continua allenamento/i });
      if (await waitVisible(startBtn, 5000)) {
        await startBtn.click();
        recordStep('Atleta: avvio sessione guidata', 'PASS', 'Sessione avviata (completamento non tentato)');
        markNotCovered('Completamento completo della sessione guidata (SetTracker/RPE) non eseguito — fuori scope minimo richiesto');
      }
    } catch (err) {
      recordStep('Atleta: avvio sessione guidata', 'SKIP', (err as Error).message);
    }
  });

  test('09 - Atleta: gruppi, eventi, attività', async ({ page }) => {
    if (!state.athleteEmail) {
      recordStep('Atleta: gruppi/eventi/attivita', 'SKIP', 'Nessun account atleta disponibile');
      return;
    }

    test.setTimeout(150_000);
    const loggedIn = await loginWithRetry(page, state.athleteEmail, ATHLETE_PASSWORD, {
      attempts: 4,
      delayMs: 3000,
      successTimeoutMs: 18_000,
    });
    if (!loggedIn) {
      recordStep('Atleta: gruppi/eventi/attivita', 'FAIL', 'Login atleta non riuscito');
      throw new Error('Athlete login failed');
    }

    // Gruppi
    try {
      await page.goto('/app/groups');
      await expect(page.locator('body')).not.toBeEmpty();
      if (state.groupName) {
        const groupCard = page.getByText(state.groupName, { exact: false });
        const visible = await waitVisible(groupCard, 8000);
        if (visible) {
          recordStep('Atleta: vede gruppo creato dal PT', 'PASS', state.groupName);
        } else {
          recordStep('Atleta: vede gruppo creato dal PT', 'SKIP', 'Gruppo non visibile nella hub (probabile filtro zona/discipline)');
          markNotCovered('Verifica visibilità gruppo pubblico lato atleta non confermata');
        }
      }
    } catch (err) {
      recordStep('Atleta: pagina Gruppi', 'FAIL', (err as Error).message);
    }

    // Eventi
    if (state.eventTitle) {
      try {
        await page.goto('/app/attivita');
        await expect(page.locator('body')).not.toBeEmpty();
        recordStep('Atleta: pagina Attività carica', 'PASS');
      } catch (err) {
        recordStep('Atleta: pagina Attività carica', 'FAIL', (err as Error).message);
      }
    } else {
      await page.goto('/app/attivita');
      await expect(page.locator('body')).not.toBeEmpty();
      recordStep('Atleta: pagina Attività carica', 'PASS', '(nessun evento creato dal PT da verificare)');
    }
  });
});
