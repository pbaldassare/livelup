// Copia bucket e oggetti Storage dal progetto sorgente a quello di destinazione.
// Uso: node scripts/migrate/copy-storage.mjs [--dry-run]
// Richiede scripts/migrate/.env.migrate con SRC_URL/SRC_SERVICE_KEY/DST_URL/DST_SERVICE_KEY.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(here, '.env.migrate'), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    }),
);

const DRY = process.argv.includes('--dry-run');
const src = createClient(env.SRC_URL, env.SRC_SERVICE_KEY, { auth: { persistSession: false } });
const dst = createClient(env.DST_URL, env.DST_SERVICE_KEY, { auth: { persistSession: false } });

async function listAll(client, bucket, prefix = '') {
  const out = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await client.storage
      .from(bucket)
      .list(prefix, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
    if (!data?.length) break;
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) out.push(...(await listAll(client, bucket, path)));
      else out.push({ path, mimetype: entry.metadata?.mimetype });
    }
    if (data.length < 100) break;
    offset += 100;
  }
  return out;
}

const { data: buckets, error: bErr } = await src.storage.listBuckets();
if (bErr) throw bErr;

const { data: dstBuckets } = await dst.storage.listBuckets();
const existing = new Set((dstBuckets ?? []).map((b) => b.id));

let copied = 0;
let skipped = 0;

for (const b of buckets) {
  if (!existing.has(b.id)) {
    console.log(`+ bucket ${b.id} (public=${b.public}, limit=${b.file_size_limit ?? '-'})`);
    if (!DRY) {
      const { error } = await dst.storage.createBucket(b.id, {
        public: b.public,
        fileSizeLimit: b.file_size_limit ?? undefined,
        allowedMimeTypes: b.allowed_mime_types ?? undefined,
      });
      if (error && !/already exists/i.test(error.message)) throw error;
    }
  }

  const files = await listAll(src, b.id);
  const present = new Set((await listAll(dst, b.id).catch(() => [])).map((f) => f.path));
  console.log(`  ${b.id}: ${files.length} oggetti (${present.size} già presenti)`);

  for (const f of files) {
    if (present.has(f.path)) { skipped++; continue; }
    if (DRY) { copied++; continue; }
    const { data: blob, error: dErr } = await src.storage.from(b.id).download(f.path);
    if (dErr) { console.warn(`  ! download ${b.id}/${f.path}: ${dErr.message}`); continue; }
    const buf = Buffer.from(await blob.arrayBuffer());
    const { error: uErr } = await dst.storage
      .from(b.id)
      .upload(f.path, buf, { contentType: f.mimetype || blob.type, upsert: true });
    if (uErr) { console.warn(`  ! upload ${b.id}/${f.path}: ${uErr.message}`); continue; }
    copied++;
    if (copied % 50 === 0) console.log(`  ... ${copied} copiati`);
  }
}

console.log(`\nFatto${DRY ? ' (dry-run)' : ''}: ${copied} copiati, ${skipped} già presenti.`);
