// Genera gli screenshot App Store in store-assets/app-store/<display>/:
//   6.3/ per iPhone 6,1"-6,3" (1206x2622): quelli che App Store Connect chiede nella versione
//   6.9/ per iPhone 6,9" (1320x2868): facoltativi, da caricare se Apple li chiede
// Stesse tavole di scripts/play-store-assets.mjs (titolo + telefono), con le catture
// prese dal simulatore iOS (xcrun simctl io <id> screenshot) in store-assets/app-store/raw/.
// Uso: node scripts/app-store-assets.mjs
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'store-assets/app-store';
const RAW = path.join(OUT, 'raw');

// La tavola è disegnata a 1320 di larghezza; le altre misure la scalano.
const BASE_W = 1320;
const SIZES = [
  ['6.3', 1206, 2622],
  ['6.9', 1320, 2868],
];

// [cattura, prima riga, seconda riga in rosso]. Quelle che mancano vengono saltate.
const SCREENS = [
  ['atleta-01-home', 'Il tuo allenamento,', 'ogni giorno'],
  ['atleta-02-programma', 'Il programma del tuo', 'Personal Trainer'],
  ['atleta-03-scheda', 'Segui la scheda', 'set dopo set'],
  ['atleta-04-scopri', 'Trova il coach giusto', 'vicino a te'],
  ['pt-01-home', 'Per i PT: la giornata', 'a colpo d’occhio'],
  ['pt-02-atleti', 'Tutti i tuoi atleti', 'in un posto'],
  ['pt-03-schede', 'Crea schede', 'in pochi minuti'],
  ['pt-04-chat', 'Parla con i tuoi', 'atleti'],
];

const dataUri = (file) => `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;

const html = (shot, l1, l2, w, h) => `
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@800;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; box-sizing: border-box; }
    body { width: ${w}px; height: ${h}px; overflow: hidden; color: #fff;
           font-family: Inter, system-ui, sans-serif;
           background: radial-gradient(circle at 50% 0%, rgba(231,50,53,.45), transparent 50%), #000; }
    .tavola { position: relative; width: ${BASE_W}px; height: ${(h * BASE_W) / w}px; zoom: ${w / BASE_W}; }
    h1 { position: absolute; top: 150px; width: 100%; text-align: center;
         font-size: 104px; font-weight: 900; line-height: 1.1; letter-spacing: -2px; }
    .red { color: #ff2a2f; }
    .phone { position: absolute; left: 50%; top: 560px; width: 1000px; transform: translateX(-50%);
             border: 18px solid #1c1c1c; border-radius: 120px; overflow: hidden; background: #000;
             box-shadow: 0 0 0 3px #333, 0 50px 160px rgba(231,50,53,.25); }
    .phone img { display: block; width: 100%; }
  </style>
  <body><div class="tavola"><h1>${l1}<br><span class="red">${l2}</span></h1>
  <div class="phone"><img src="${shot}"></div></div></body>`;

const browser = await chromium.launch();
for (const [display, w, h] of SIZES) {
  const dir = path.join(OUT, display);
  fs.mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  let n = 0;
  for (const [name, l1, l2] of SCREENS) {
    const file = path.join(RAW, `${name}.png`);
    if (!fs.existsSync(file)) {
      console.warn('… manca', file);
      continue;
    }
    n += 1;
    await page.setContent(html(dataUri(file), l1, l2, w, h), { waitUntil: 'networkidle' });
    const out = path.join(dir, `${String(n).padStart(2, '0')}-${name}.png`);
    // Niente canale alfa: App Store Connect rifiuta gli screenshot trasparenti.
    await page.screenshot({ path: out, type: 'png', omitBackground: false });
    console.log('✓', out);
  }
  await page.close();
}
await browser.close();
