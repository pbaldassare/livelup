import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const filePath = process.argv[2];
const objectPath = process.argv[3];
const exerciseId = process.argv[4];
if (!filePath || !objectPath || !exerciseId) {
  console.error('usage: node upload-one-exercise-video.mjs <local-mp4> <storage-path> <exercise-id>');
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
  console.error('No service key');
  process.exit(1);
}

const url = 'https://kxgaqnksylntokyrpaxp.supabase.co';
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const body = readFileSync(filePath);
const { error } = await supabase.storage.from('exercise-videos').upload(objectPath, body, {
  upsert: true,
  contentType: 'video/mp4',
  cacheControl: '31536000',
});
if (error) {
  console.error(error.message);
  process.exit(1);
}
const { data } = supabase.storage.from('exercise-videos').getPublicUrl(objectPath);
const publicUrl = data.publicUrl;
const { error: uErr } = await supabase.from('exercises').update({ video_url: publicUrl }).eq('id', exerciseId);
if (uErr) {
  console.error(uErr.message);
  process.exit(1);
}
console.log('OK', publicUrl);
