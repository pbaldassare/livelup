// Genera gli asset Google Play in store-assets/play/:
//   icon-512.png (512x512), feature-graphic-1024x500.png, screenshots/NN-*.png (1080x1920)
// Le schermate vere vengono da `npm run screenshots:mobile` (test-results/mobile-screenshots/).
// Uso: node scripts/play-store-assets.mjs
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'store-assets/play';
const SHOTS = 'test-results/mobile-screenshots';

const dataUri = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
const mark = dataUri('src/assets/livelapp-mark.png', 'image/jpeg');
const logoWhite = fs
  .readFileSync('src/assets/livellapp-logo.svg', 'utf8')
  .replace('fill: url(#Sfumatura_senza_nome);', 'fill: #fff;')
  .replace(/<\?xml[^>]*>/, '');

const SCREENS = [
  ['atleta/01-home', 'Il tuo allenamento,', 'ogni giorno'],
  ['atleta/05b-allenamento', 'Segui la scheda', 'set dopo set'],
  ['atleta/08-progressi', 'Guarda i progressi', 'crescere'],
  ['atleta/07-chat', 'Parla con il tuo', 'Professionista'],
  ['atleta/04-scopri', 'Trova il coach giusto', 'vicino a te'],
  ['pt/02-atleti', 'Per i PT: tutti gli atleti', 'in un posto'],
  ['pt/04-schede', 'Crea schede', 'in pochi minuti'],
  ['pt/03-calendario', 'Calendario e sessioni', 'sotto controllo'],
];

const base = `
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;800;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; box-sizing: border-box; }
    body { background: #000; color: #fff; font-family: Inter, system-ui, sans-serif; overflow: hidden; }
    .red { color: #ff2a2f; }
    .phone { border: 14px solid #1c1c1c; border-radius: 68px; overflow: hidden; background: #000;
             box-shadow: 0 0 0 2px #333, 0 40px 120px rgba(231,50,53,.25); }
    .phone img { display: block; width: 100%; }
  </style>`;

const iconHtml = `${base}<body style="width:512px;height:512px"><img src="${mark}" style="width:512px;height:512px;display:block">`;

const featureHtml = (shot) => `${base}
<body style="width:1024px;height:500px;position:relative;
  background:radial-gradient(circle at 80% 30%, rgba(231,50,53,.35), transparent 55%), #000">
  <div style="position:absolute;left:72px;top:150px;width:520px">
    <div style="width:470px">${logoWhite}</div>
    <p style="margin-top:28px;font-size:30px;font-weight:800;line-height:1.2">
      Allenati con il tuo <span class="red">Personal Trainer</span>.
    </p>
    <p style="margin-top:10px;font-size:21px;font-weight:500;color:#bbb">Schede, chat e progressi in un'unica app.</p>
  </div>
  ${shot ? `<div class="phone" style="position:absolute;left:680px;top:60px;width:270px;transform:rotate(-6deg);border-width:9px;border-radius:40px">
    <img src="${shot}"></div>` : ''}
</body>`;

const screenHtml = (shot, l1, l2) => `${base}
<body style="width:1080px;height:1920px;position:relative;
  background:radial-gradient(circle at 50% 0%, rgba(231,50,53,.45), transparent 50%), #000">
  <h1 style="position:absolute;top:110px;width:100%;text-align:center;font-size:78px;font-weight:900;line-height:1.1;letter-spacing:-1.5px">
    ${l1}<br><span class="red">${l2}</span></h1>
  <div class="phone" style="position:absolute;left:206px;top:380px;width:668px"><img src="${shot}"></div>
</body>`;

async function render(page, html, w, h, file) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(OUT, file), omitBackground: true });
  console.log('✓', file);
}

fs.mkdirSync(path.join(OUT, 'screenshots'), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();

await render(page, iconHtml, 512, 512, 'icon-512.png');

const shotFile = (name) => path.join(SHOTS, `${name}.png`);
const home = fs.existsSync(shotFile('atleta/01-home')) ? dataUri(shotFile('atleta/01-home'), 'image/png') : null;
await render(page, featureHtml(home), 1024, 500, 'feature-graphic-1024x500.png');

// Numero fisso per schermata: l'ordine sullo store resta giusto anche se ne manca qualcuna.
for (const [i, [name, l1, l2]] of SCREENS.entries()) {
  if (!fs.existsSync(shotFile(name))) {
    console.warn('… manca', shotFile(name), '(lancia npm run screenshots:mobile)');
    continue;
  }
  const file = `screenshots/${String(i + 1).padStart(2, '0')}-${name.replace('/', '-')}.png`;
  await render(page, screenHtml(dataUri(shotFile(name), 'image/png'), l1, l2), 1080, 1920, file);
}

await browser.close();
