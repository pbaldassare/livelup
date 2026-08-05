import { test, expect } from '@playwright/test';
import {
  loginWithRetry,
  dismissWelcomeTourIfPresent,
  waitVisible,
  completeUserNameGateIfPresent,
} from './helpers/authFlows';

/**
 * E2E — Lato atleta: esegue un corso (pt_courses) se disponibile,
 * altrimenti verifica l'esecuzione allenamento (Continua / Inizia).
 *
 * Env:
 *   E2E_ATHLETE_EMAIL / E2E_ATHLETE_PASSWORD
 *   E2E_PT_EMAIL / E2E_PT_PASSWORD (opzionale: pubblica bozze)
 */
const ATHLETE_EMAIL =
  process.env.E2E_ATHLETE_EMAIL ?? 'giulia.rossi.atleta@gmail.com';
const ATHLETE_PASSWORD = process.env.E2E_ATHLETE_PASSWORD ?? 'GiuliaLivel2026!';

const PT_CANDIDATES: Array<{ email: string; password: string }> = [
  ...(process.env.E2E_PT_EMAIL && process.env.E2E_PT_PASSWORD
    ? [{ email: process.env.E2E_PT_EMAIL, password: process.env.E2E_PT_PASSWORD }]
    : []),
  { email: 'coachbance1@gmail.com', password: 'Leone123!' },
  { email: 'marco.ferrari.pt@gmail.com', password: 'Leone123!' },
];

async function loginFirstWorkingPt(page: import('@playwright/test').Page): Promise<string | null> {
  for (const cand of PT_CANDIDATES) {
    console.log(`[COURSE] provo login PT ${cand.email}`);
    try {
      const ok = await loginWithRetry(page, cand.email, cand.password, {
        attempts: 2,
        delayMs: 1000,
        successTimeoutMs: 10_000,
      });
      if (ok) {
        await completeUserNameGateIfPresent(page);
        await dismissWelcomeTourIfPresent(page);
        return cand.email;
      }
    } catch (err) {
      console.log(`[COURSE] login PT ${cand.email} errore: ${(err as Error).message}`);
    }
  }
  return null;
}

async function loginAthlete(page: import('@playwright/test').Page) {
  const ok = await loginWithRetry(page, ATHLETE_EMAIL, ATHLETE_PASSWORD, {
    attempts: 8,
    delayMs: 2000,
    successTimeoutMs: 20_000,
  });
  expect(ok, `Login atleta fallito (${ATHLETE_EMAIL})`).toBeTruthy();
  await completeUserNameGateIfPresent(page);
  await dismissWelcomeTourIfPresent(page);
}

test.describe('Atleta — corso / allenamento', () => {
  test.describe.configure({ mode: 'serial', timeout: 200_000 });

  test('00 - PT: pubblica bozze (best-effort)', async ({ page }) => {
    const ptEmail = await loginFirstWorkingPt(page);
    if (!ptEmail) {
      console.log('[COURSE] Skip publish PT');
      return;
    }
    await page.goto('/pt/courses');
    await expect(page.getByRole('heading', { name: 'Corsi' })).toBeVisible({ timeout: 25_000 });
    for (let i = 0; i < 5; i++) {
      const publishBtn = page.getByRole('button', { name: /^Pubblica$/ }).first();
      if (!(await waitVisible(publishBtn, 2000))) break;
      await publishBtn.click();
      await page.waitForTimeout(700);
    }
    console.log(`[COURSE] publish done for ${ptEmail}`);
  });

  test('01 - Atleta: esegue corso se disponibile', async ({ page }) => {
    await loginAthlete(page);

    await page.goto('/app/courses');
    await expect(page).toHaveURL(/\/app\/courses/, { timeout: 20_000 });
    await page.waitForTimeout(1200);

    const emptyDiscover = await waitVisible(page.getByText(/Nessun corso da scoprire/i), 2500);
    const emptyMineTab = page.getByRole('tab', { name: /I miei corsi/i });
    if (await waitVisible(emptyMineTab, 2000)) {
      await emptyMineTab.click();
    }
    const emptyMine = await waitVisible(page.getByText(/Nessun corso attivo/i), 2000);

    const enrollBtn = page.getByRole('button', { name: /Iscriviti/i }).first();
    const hasEnroll = await waitVisible(enrollBtn, 3000);

    if (!hasEnroll && emptyDiscover && emptyMine) {
      test.info().annotations.push({
        type: 'note',
        description: 'Nessun corso pubblicato/iscritto — skip corso, copre allenamento nello step 02',
      });
      console.log('[COURSE] Nessun corso lato atleta — skip esecuzione corso');
      return;
    }

    // Torna a Scopri per iscriverti
    const discoverTab = page.getByRole('tab', { name: /Scopri/i });
    if (await waitVisible(discoverTab, 2000)) await discoverTab.click();

    if (await waitVisible(enrollBtn, 4000)) {
      await enrollBtn.click();
    } else {
      await page.getByText(/Gratuito|Principiante|Intermedio|Avanzato/i).first().click();
    }

    await expect(page).toHaveURL(/\/app\/courses\/.+/, { timeout: 25_000 });
    await expect(page.getByText(/Percorso/i).first()).toBeVisible({ timeout: 20_000 });

    const enrollDetail = page.getByRole('button', { name: /Iscriviti al corso/i });
    if (await waitVisible(enrollDetail, 2500)) {
      await enrollDetail.click();
      await expect(page.getByText(/Iscritto al corso|Completamento/i).first()).toBeVisible({
        timeout: 15_000,
      });
    }

    const stepButtons = page.locator('button').filter({ hasText: /Step\s+\d+/i });
    await expect(stepButtons.first()).toBeVisible({ timeout: 15_000 });

    let completed = false;
    const stepCount = await stepButtons.count();
    for (let i = 0; i < stepCount; i++) {
      const btn = stepButtons.nth(i);
      const row = btn.locator('xpath=ancestor::div[contains(@class,"rounded")][1]');
      if ((await row.locator('svg.lucide-lock').count()) > 0) continue;
      await btn.click();
      const markDone = page.getByRole('button', {
        name: /Segna come completato|Ho visto il video/i,
      });
      if (!(await waitVisible(markDone, 3500))) continue;
      if (await markDone.isDisabled()) continue;
      await markDone.click();
      await expect(page.getByText(/Step completato/i).first()).toBeVisible({ timeout: 15_000 });
      completed = true;
      break;
    }
    expect(completed).toBeTruthy();
  });

  test('02 - Atleta: esegue / riprende allenamento (verifica player)', async ({ page }) => {
    await loginAthlete(page);
    await page.goto('/app');
    await expect(page).toHaveURL(/\/app(\/|$|\?)/, { timeout: 20_000 });

    const continua = page.getByRole('button', { name: /Continua allenamento|Inizia allenamento|Riprendi/i });
    const hasWorkoutCta = await waitVisible(continua, 8000);

    if (!hasWorkoutCta) {
      // Fallback: Programma → primo workout
      await page.goto('/app/programma');
      const open = page.getByRole('button', { name: /Apri|Inizia|Continua/i }).first();
      if (await waitVisible(open, 8000)) {
        await open.click();
      } else {
        test.skip(true, 'Nessun allenamento assegnato all\'atleta');
      }
    } else {
      await continua.click();
    }

    // Deve entrare nel dettaglio / player
    await page.waitForURL(/\/app\/(workouts|allenamenti|workout)/i, { timeout: 25_000 }).catch(() => undefined);

    // Marker player / dettaglio
    const playerMarkers = page
      .getByText(/Serie|Set|Inizia|Continua|Completa|Esercizio|RECUPERO|Recupero/i)
      .first();
    await expect(playerMarkers).toBeVisible({ timeout: 25_000 });

    // Se c'è un CTA per partire nel flow guidato, cliccalo
    const startFlow = page.getByRole('button', {
      name: /Inizia|Continua|Avvia|Inizia allenamento|Continua allenamento/i,
    }).first();
    if (await waitVisible(startFlow, 4000)) {
      await startFlow.click();
      await page.waitForTimeout(1500);
    }

    // Verifica che non sia una pagina errore
    await expect(page.getByText(/Errore|non trovato|Non autorizzato/i)).toHaveCount(0);
    console.log('[COURSE] Player/dettaglio allenamento OK');
  });
});
