import { test, expect, devices, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import {
  loginWithRetry,
  dismissWelcomeTourIfPresent,
  completeUserNameGateIfPresent,
  waitVisible,
} from './helpers/authFlows';

const ATHLETE_EMAIL = process.env.E2E_ATHLETE_EMAIL ?? 'paolo.baldassare@gmail.com';
const ATHLETE_PASSWORD = process.env.E2E_ATHLETE_PASSWORD ?? 'Leonebianco123!';
const PT_CREDENTIALS: Array<{ email: string; password: string }> = [
  ...(process.env.E2E_PT_EMAIL && process.env.E2E_PT_PASSWORD
    ? [{ email: process.env.E2E_PT_EMAIL, password: process.env.E2E_PT_PASSWORD }]
    : []),
  { email: 'coachbance1@gmail.com', password: 'Leone123!' },
  { email: 'marco.ferrari.pt@gmail.com', password: 'Leone123!' },
  { email: 'elena.vitale.pt@fitplatform.com', password: 'Leone123!' },
  { email: 'davide.russo.pt@fitplatform.com', password: 'Leone123!' },
  { email: 'chiara.lombardi.pt@fitplatform.com', password: 'Leone123!' },
];

async function loginFirstWorking(
  page: Page,
  credentials: Array<{ email: string; password: string }>,
): Promise<{ email: string; password: string } | null> {
  const unique = credentials.filter(
    (c, i, arr) => arr.findIndex((x) => x.email === c.email) === i,
  );
  for (const cred of unique) {
    const ok = await loginWithRetry(page, cred.email, cred.password, {
      attempts: 2,
      delayMs: 1200,
      successTimeoutMs: 18_000,
    });
    if (ok) return cred;
  }
  return null;
}

const BASE_OUT = path.join('test-results', 'mobile-screenshots');
const ATHLETE_OUT = path.join(BASE_OUT, 'atleta');
const PT_OUT = path.join(BASE_OUT, 'pt');

async function capture(page: Page, outDir: string, name: string) {
  fs.mkdirSync(outDir, { recursive: true });
  await page.waitForTimeout(600);
  await dismissWelcomeTourIfPresent(page);
  await page.screenshot({
    path: path.join(outDir, `${name}.png`),
    fullPage: false,
  });
}

async function gotoScreen(page: Page, url: string, outDir: string, name: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForTimeout(900);
  await dismissWelcomeTourIfPresent(page);
  await capture(page, outDir, name);
}

function zipFolder(sourceDir: string, zipPath: string) {
  if (!fs.existsSync(sourceDir)) return;
  const files = fs.readdirSync(sourceDir).filter((f) => f.endsWith('.png'));
  if (files.length === 0) return;

  fs.mkdirSync(path.dirname(zipPath), { recursive: true });
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

  const absSource = path.resolve(sourceDir);
  const absZip = path.resolve(zipPath);
  // PowerShell Compress-Archive (Windows-friendly)
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${absSource}\\*' -DestinationPath '${absZip}' -Force"`,
    { stdio: 'inherit' },
  );
}

// Viewport mobile iPhone-like su Chromium (WebKit non richiesto)
test.use({
  viewport: { width: 390, height: 844 },
  userAgent: devices['iPhone 14'].userAgent,
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
});

test.describe('Mobile screenshots — Atleta', () => {
  test.describe.configure({ mode: 'serial', timeout: 300_000 });

  test('cattura ~10 schermate PWA atleta', async ({ page }) => {
    const ok = await loginWithRetry(page, ATHLETE_EMAIL, ATHLETE_PASSWORD, {
      attempts: 6,
      delayMs: 2000,
      successTimeoutMs: 25_000,
    });
    expect(ok, `Login atleta fallito (${ATHLETE_EMAIL})`).toBeTruthy();

    await completeUserNameGateIfPresent(page, 'Paolo', 'Baldassare');
    await dismissWelcomeTourIfPresent(page);

    if (!page.url().includes('/app')) {
      await page.goto('/app');
    }
    await expect(page).toHaveURL(/\/app/, { timeout: 20_000 });

    const screens: Array<{ url: string; name: string }> = [
      { url: '/app', name: '01-home' },
      { url: '/app/programma', name: '02-programma' },
      { url: '/app/attivita', name: '03-attivita' },
      { url: '/app/discover', name: '04-scopri' },
      { url: '/app/esercizi', name: '05-esercizi' },
      { url: '/app/courses', name: '06-corsi' },
      { url: '/app/chat', name: '07-chat' },
      { url: '/app/progress', name: '08-progressi' },
      { url: '/app/profile', name: '09-profilo' },
      { url: '/app/settings', name: '10-impostazioni' },
    ];

    for (const screen of screens) {
      await gotoScreen(page, screen.url, ATHLETE_OUT, screen.name);
    }

    // Bonus: player allenamento se disponibile dalla home
    await gotoScreen(page, '/app', ATHLETE_OUT, '01-home');
    const workoutCta = page.getByRole('button', {
      name: /Continua allenamento|Inizia allenamento|Riprendi/i,
    });
    if (await waitVisible(workoutCta, 4000)) {
      await workoutCta.click();
      await page.waitForTimeout(1500);
      await capture(page, ATHLETE_OUT, '05b-allenamento');
    }

    zipFolder(ATHLETE_OUT, path.join('test-results', 'livelapp-atleta-mobile.zip'));
    // eslint-disable-next-line no-console
    console.log(`\n✓ Zip atleta: test-results/livelapp-atleta-mobile.zip (${ATHLETE_OUT})\n`);
  });
});

test.describe('Mobile screenshots — PT', () => {
  test.describe.configure({ mode: 'serial', timeout: 300_000 });

  test('cattura ~10 schermate PWA PT', async ({ page }) => {
    if (!process.env.E2E_PT_EMAIL || !process.env.E2E_PT_PASSWORD) {
      test.skip(
        true,
        'Imposta E2E_PT_EMAIL e E2E_PT_PASSWORD (es. il tuo account PT) e riesegui: npm run screenshots:mobile -- --grep PT',
      );
    }

    const cred = await loginFirstWorking(page, PT_CREDENTIALS);
    expect(cred, `Login PT fallito (${process.env.E2E_PT_EMAIL})`).toBeTruthy();
    // eslint-disable-next-line no-console
    console.log(`Login PT OK: ${cred!.email}`);

    await completeUserNameGateIfPresent(page, 'Coach', 'Demo');
    await dismissWelcomeTourIfPresent(page);

    await page.goto('/pt/app');
    await expect(page).toHaveURL(/\/pt\/app/, { timeout: 20_000 });

    const screens: Array<{ url: string; name: string }> = [
      { url: '/pt/app', name: '01-home' },
      { url: '/pt/app/athletes', name: '02-atleti' },
      { url: '/pt/app/calendar', name: '03-calendario' },
      { url: '/pt/app/templates', name: '04-schede' },
      { url: '/pt/app/chat', name: '05-chat' },
      { url: '/pt/app/courses', name: '06-corsi' },
      { url: '/pt/app/events', name: '07-eventi' },
      { url: '/pt/app/groups', name: '08-gruppi' },
      { url: '/pt/app/profile', name: '09-profilo' },
      { url: '/pt/app/settings', name: '10-impostazioni' },
    ];

    for (const screen of screens) {
      await gotoScreen(page, screen.url, PT_OUT, screen.name);
    }

    // Dettaglio atleta: apri il primo dalla lista
    await gotoScreen(page, '/pt/app/athletes', PT_OUT, '02-atleti');
    const athleteLink = page
      .locator('a[href*="/pt/app/athlete/"]')
      .or(page.getByRole('link').filter({ hasText: /.+/ }))
      .first();
    if (await waitVisible(athleteLink, 5000)) {
      await athleteLink.click();
      await page.waitForTimeout(1200);
      if (page.url().includes('/pt/app/athlete/')) {
        await capture(page, PT_OUT, '02b-dettaglio-atleta');
      }
    }

    zipFolder(PT_OUT, path.join('test-results', 'livelapp-pt-mobile.zip'));
    // eslint-disable-next-line no-console
    console.log(`\n✓ Zip PT: test-results/livelapp-pt-mobile.zip (${PT_OUT})\n`);
  });
});
