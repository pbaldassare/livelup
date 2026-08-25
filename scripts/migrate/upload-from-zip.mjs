import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

const root = process.argv[2];
if (!root) {
  console.error('usage: node upload-from-zip.mjs <extracted-dir>');
  process.exit(1);
}

const keysRaw = execFileSync(
  'npx',
  ['supabase', 'projects', 'api-keys', '--project-ref', 'kxgaqnksylntokyrpaxp', '--reveal', '--output', 'json'],
  { encoding: 'utf8', shell: true },
);
const keys = JSON.parse(keysRaw.replace(/^[\s\S]*?(\[|\{)/, (_, p) => p));
const list = Array.isArray(keys) ? keys : keys.keys || keys.api_keys || [];
const service =
  list.find((k) => /service_role/i.test(k.name || k.id || k.type || '')) ||
  list.find((k) => /secret/i.test(k.name || k.id || k.type || '') && !k.disabled);

const serviceKey = service?.api_key || service?.key || service?.secret;
if (!serviceKey) {
  console.error('No service/secret key found. Keys present:', list.map((k) => k.name || k.id || k.type));
  process.exit(1);
}

const url = 'https://kxgaqnksylntokyrpaxp.supabase.co';
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const manifestPath = join(root, 'manifest.json');
const manifestMime = new Map();
if (existsSync(manifestPath)) {
  for (const row of JSON.parse(readFileSync(manifestPath, 'utf8'))) {
    if (row.bucket && row.path && row.mime) manifestMime.set(`${row.bucket}/${row.path}`, row.mime);
  }
}

const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
};

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const buckets = readdirSync(root).filter((name) => statSync(join(root, name)).isDirectory());
let ok = 0;
let fail = 0;

for (const bucket of buckets) {
  const files = walk(join(root, bucket));
  console.log(`\n==> ${bucket} (${files.length} file)`);
  for (const file of files) {
    const objectPath = relative(join(root, bucket), file).split(sep).join('/');
    const ext = extname(file).toLowerCase();
    const body = readFileSync(file);
    let contentType = MIME[ext] || manifestMime.get(`${bucket}/${objectPath}`);
    if (!contentType && body.length >= 12) {
      if (body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) contentType = 'image/jpeg';
      else if (body[0] === 0x89 && body[1] === 0x50 && body[2] === 0x4e && body[3] === 0x47) contentType = 'image/png';
      else if (body[0] === 0x47 && body[1] === 0x49 && body[2] === 0x46) contentType = 'image/gif';
      else if (body.toString('ascii', 0, 4) === 'RIFF' && body.toString('ascii', 8, 12) === 'WEBP') contentType = 'image/webp';
      else if (objectPath.toLowerCase().includes('jpg') || objectPath.toLowerCase().includes('jpeg')) contentType = 'image/jpeg';
      else if (objectPath.toLowerCase().includes('png')) contentType = 'image/png';
    }
    const { error } = await supabase.storage.from(bucket).upload(objectPath, body, {
      upsert: true,
      contentType,
    });
    if (error) {
      fail++;
      console.error(`  FAIL ${bucket}/${objectPath}: ${error.message}`);
    } else {
      ok++;
      console.log(`  OK ${objectPath} (${body.length} b)`);
    }
  }
}

console.log(`\nUploaded ${ok}, failed ${fail}`);
if (fail) process.exit(1);
