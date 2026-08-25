import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2];
if (!root) {
  console.error('usage: node upload-storage-zip.mjs <extracted-dir>');
  process.exit(1);
}

const buckets = readdirSync(root).filter((name) => {
  const p = join(root, name);
  return statSync(p).isDirectory();
});

for (const bucket of buckets) {
  const src = join(root, bucket);
  const dst = `ss:///${bucket}`;
  console.log(`\n==> ${bucket}`);
  execFileSync(
    'npx',
    ['supabase', 'storage', 'cp', '-r', '--experimental', '--linked', '--yes', '-j', '2', src, dst],
    { stdio: 'inherit', shell: true, cwd: process.cwd() },
  );
}

console.log('\nDone buckets:', buckets.join(', '));
