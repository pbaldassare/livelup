import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const W = 1200;
const H = 630;
const markPath = path.join(root, 'src/assets/livelapp-mark.png');
const outPath = path.join(root, 'public/og-image.png');

const logoSize = 280;
const logoBuf = await sharp(markPath)
  .resize(logoSize, logoSize, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

const textSvg = Buffer.from(`
  <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#000000"/>
    <text x="50%" y="460" text-anchor="middle"
      font-family="Arial Black, Arial, Helvetica, sans-serif"
      font-size="64" font-weight="700" letter-spacing="8" fill="#FFFFFF">LIVELLAPP</text>
    <text x="50%" y="520" text-anchor="middle"
      font-family="Arial, Helvetica, sans-serif"
      font-size="28" font-weight="400" fill="#A3A3A3">Allenamenti, chat e progressi — PT e Atleti</text>
  </svg>
`);

const logoLeft = Math.round((W - logoSize) / 2);
const logoTop = 110;

await sharp(textSvg)
  .composite([{ input: logoBuf, left: logoLeft, top: logoTop }])
  .png()
  .toFile(outPath);

const meta = await sharp(outPath).metadata();
console.log('wrote', outPath, `${meta.width}x${meta.height}`, 'bytes', fs.statSync(outPath).size);
