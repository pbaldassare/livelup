import { test, expect, type Page } from '@playwright/test';
import {
  loginWithRetry,
  dismissWelcomeTourIfPresent,
  waitVisible,
  completeUserNameGateIfPresent,
} from './helpers/authFlows';
import fs from 'node:fs';
import path from 'node:path';

const EMAIL = process.env.E2E_ATHLETE_EMAIL ?? 'paolo.baldassare@gmail.com';
const PASSWORD = process.env.E2E_ATHLETE_PASSWORD ?? 'Leonebianco123!';
const OUT_DIR = path.join('test-results', 'athlete-paolo-tour');
const findings: string[] = [];

function note(msg: string) {
  // eslint-disable-next-line no-console
  console.log(`[TOUR] ${msg}`);
  findings.push(msg);
}

async function shot(page: Page, name: string) {
  if (page.isClosed()) return;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: true }).catch(() => undefined);
}

async function assertNotBlank(page: Page, label: string) {
  if (page.isClosed()) {
    note(`CLOSED: ${label}`);
    return false;
  }
  const mainText = ((await page.locator('main').innerText().catch(() => '')) || '').trim();
  const bodyText = ((await page.locator('body').innerText().catch(() => '')) || '').trim();
  const text = mainText || bodyText;
  if (text.length < 8) {
    note(`BLANK: ${label} (${text.length} chars) ${page.url()}`);
    await shot(page, `blank-${label}`);
    return false;
  }
  if (await waitVisible(page.getByText(/Errore|Something went wrong|Ops! Qualcosa/i).first(), 600)) {
    note(`ERROR UI: ${label} @ ${page.url()}`);
    await shot(page, `error-${label}`);
  }
  return true;
}

async function safeGoto(page: Page, url: string, label: string) {
  if (page.isClosed()) {
    note(`SKIP goto ${label}: page closed`);
    return false;
  }
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(900);
    await dismissWelcomeTourIfPresent(page);
    await shot(page, label);
    await assertNotBlank(page, label);
    note(`OK ${url}`);
    return true;
  } catch (e) {
    note(`FAIL goto ${label}: ${(e as Error).message}`);
    return false;
  }
}

test.describe('Atleta Paolo — tour umano', () => {
  test.describe.configure({ mode: 'serial', timeout: 480_000 });

  test('login + tour app atleta', async ({ page }) => {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    page.on('pageerror', (err) => note(`PAGEERROR: ${err.message}`));
    page.on('crash', () => note('PAGE CRASH'));

    const ok = await loginWithRetry(page, EMAIL, PASSWORD, {
      attempts: 6,
      delayMs: 1500,
      successTimeoutMs: 25_000,
    });
    expect(ok, `Login fallito ${EMAIL}`).toBeTruthy();
    await completeUserNameGateIfPresent(page, 'Paolo', 'Baldassare');
    await dismissWelcomeTourIfPresent(page);
    if (page.url().includes('/pt') && !page.url().includes('/app')) {
      await page.goto('/app');
    }
    await expect(page).toHaveURL(/\/app/, { timeout: 20_000 });
    await shot(page, '01-home');
    note(`Login OK → ${page.url()}`);

    // Bottom nav (scoped) — evita match "Profilo incompleto" in Discover
    const nav = page.locator('nav').last();
    const navItems = [
      { name: /^Home$/i, label: 'nav-home' },
      { name: /^Programma$/i, label: 'nav-programma' },
      { name: /^Attivit/i, label: 'nav-attivita' },
      { name: /^Scopri$/i, label: 'nav-scopri' },
      { name: /^Profilo$/i, label: 'nav-profilo' },
    ];
    for (const item of navItems) {
      const link = nav.getByRole('link', { name: item.name });
      if (!(await waitVisible(link, 4000))) {
        note(`NAV MISSING ${item.label}`);
        continue;
      }
      await link.click();
      await page.waitForTimeout(1000);
      await shot(page, item.label);
      await assertNotBlank(page, item.label);
      note(`${item.label} → ${page.url()}`);
      if (item.label === 'nav-profilo' && !page.url().includes('/app/profile')) {
        note(`BUG: Profilo nav andò a ${page.url()} (atteso /app/profile)`);
      }
    }

    const routes = [
      '/app',
      '/app/programma',
      '/app/workout',
      '/app/esercizi',
      '/app/attivita',
      '/app/discover',
      '/app/courses',
      '/app/chat',
      '/app/progress',
      '/app/profile',
      '/app/settings',
      '/app/notifications',
      '/app/groups',
      '/app/subscription',
      '/app/documenti',
      '/app/help',
      '/app/coupons',
      '/app/booking',
    ];
    for (const r of routes) {
      await safeGoto(page, r, `route-${r.replace(/\//g, '_')}`);
    }

    // Workout: apri da home senza restare nel player (evita crash lunghi)
    await safeGoto(page, '/app', 'home-before-workout');
    const continua = page.getByRole('button', {
      name: /Continua allenamento|Inizia allenamento|Riprendi/i,
    });
    if (await waitVisible(continua, 5000)) {
      await continua.click();
      await page.waitForTimeout(2000);
      await shot(page, '04-workout');
      await assertNotBlank(page, 'workout');
      note(`Workout → ${page.url()}`);
      // Esci subito
      await page.keyboard.press('Escape').catch(() => undefined);
      await safeGoto(page, '/app', 'home-after-workout');
    } else {
      note('SKIP workout CTA');
    }

    // Corsi
    await safeGoto(page, '/app/courses', 'courses');
    const enroll = page.getByRole('button', { name: /Iscriviti/i }).first();
    if (await waitVisible(enroll, 3000)) {
      await enroll.click();
      await page.waitForTimeout(1500);
      await shot(page, '05-course-detail');
      note(`Corso → ${page.url()}`);
      const avvia = page.getByRole('button', { name: /Avvia corso/i }).first();
      if (await waitVisible(avvia, 2500)) {
        await avvia.click();
        await page.waitForTimeout(1500);
        await shot(page, '05-course-run');
        note(`Avvia corso → ${page.url()}`);
        await safeGoto(page, '/app/courses', 'courses-back');
      }
    } else {
      const mine = page.getByRole('tab', { name: /I miei corsi/i });
      if (await waitVisible(mine, 2000)) {
        await mine.click();
        await page.waitForTimeout(800);
        await shot(page, '05-my-courses');
      }
      note('SKIP iscrizione corso (nessun Iscriviti)');
    }

    // Chat coach
    await safeGoto(page, '/app', 'home-chat');
    const contatta = page.getByRole('button', { name: /Contatta/i }).first();
    if (await waitVisible(contatta, 4000)) {
      await contatta.click();
      await page.waitForTimeout(1500);
      await shot(page, '06-chat');
      const input = page
        .getByPlaceholder(/messaggio|scrivi|message/i)
        .or(page.locator('textarea'))
        .first();
      if (await waitVisible(input, 4000)) {
        await input.fill(`Test e2e ${Date.now()}`);
        const send = page.getByRole('button', { name: /Invia|Send/i }).first();
        if (await waitVisible(send, 2000)) await send.click();
        else await page.keyboard.press('Enter');
        await page.waitForTimeout(800);
        await shot(page, '06-chat-sent');
        note('Chat messaggio inviato');
      } else {
        note('SKIP chat input');
      }
    } else {
      await safeGoto(page, '/app/chat', 'chat-list');
      note('SKIP Contatta in home');
    }

    // Invita amico
    await safeGoto(page, '/app', 'home-invite');
    const invita = page.getByText(/Invita un amico/i).first();
    if (await waitVisible(invita, 3000)) {
      await invita.click();
      await page.waitForTimeout(1000);
      await shot(page, '07-invite');
      note(`Invita → ${page.url()}`);
    } else {
      note('SKIP Invita amico');
    }

    // Gruppi + nuovo
    await safeGoto(page, '/app/groups', 'groups');
    const nuovo = page.getByRole('link', { name: /Nuovo|Crea/i }).or(
      page.getByRole('button', { name: /Nuovo|Crea/i }),
    ).first();
    if (await waitVisible(nuovo, 3000)) {
      await nuovo.click();
      await page.waitForTimeout(1000);
      await shot(page, '08-group-new');
      note(`Gruppo create → ${page.url()}`);
    }

    // Booking / eventi (atleta non crea eventi PT; prova booking)
    await safeGoto(page, '/app/booking', 'booking');
    await safeGoto(page, '/app/attivita', 'attivita-final');

    const reportPath = path.join(OUT_DIR, 'findings.txt');
    fs.writeFileSync(reportPath, findings.join('\n') + '\n', 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n===== FINDINGS =====\n' + findings.join('\n'));

    const blanks = findings.filter((f) => f.startsWith('BLANK') || f.startsWith('BUG') || f.startsWith('PAGEERROR'));
    expect(blanks, `Anomalie:\n${blanks.join('\n')}`).toEqual([]);
  });
});
