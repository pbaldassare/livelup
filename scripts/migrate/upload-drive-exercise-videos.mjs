/**
 * Upload locale MP4 (cartella Drive) → bucket exercise-videos + exercises.video_url.
 * Usage:
 *   node scripts/migrate/upload-drive-exercise-videos.mjs [--dry-run]
 */
import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const PROJECT_REF = 'kxgaqnksylntokyrpaxp'
const VIDEO_ROOT = 'C:\\Users\\Utente\\Desktop\\livelapp video totali\\video livelapp'
const ADMIN_PREFIX = '0751d120-a47d-44b8-9262-75e5be4726c8'
const DRY = process.argv.includes('--dry-run')
const CONCURRENCY = 2

function titleCase(raw) {
  const s = raw.replace(/&amp;/g, '&').replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
  const titled = s.toLowerCase().replace(/(^|[\s\-_/])(\w)/g, (_, a, b) => a + b.toUpperCase())
  return titled
    .replace(/\bHspu\b/gi, 'HSPU')
    .replace(/\bOap\b/gi, 'OAP')
    .replace(/\bOac\b/gi, 'OAC')
    .replace(/\bTed\b/gi, 'TED')
    .replace(/\bL-sit\b/gi, 'L-sit')
    .replace(/\bV-sit\b/gi, 'V-sit')
}

function normalizePhrase(s) {
  return s
    .toLowerCase()
    .replace(/&amp;/g, '&')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function folderAliases(folder) {
  const n = normalizePhrase(folder)
  const set = new Set([n])
  if (n.endsWith('s')) set.add(n.slice(0, -1))
  if (n === 'legs') set.add('leg')
  if (n === 'push up') {
    set.add('push ups')
    set.add('pushup')
    set.add('pushups')
  }
  if (n === 'pull up') {
    set.add('pull ups')
    set.add('pullup')
    set.add('pullups')
  }
  if (n === 'l sit') set.add('lsit')
  if (n === 'v sit') set.add('vsit')
  if (n === 'bar muscle up' || n === 'ring muscle up') set.add('muscle up')
  if (n === 'warm up') set.add('warmup')
  return [...set].sort((a, b) => b.length - a.length)
}

function stripFolderFromVariant(folder, variant) {
  const phrases = folderAliases(folder)
  let v = normalizePhrase(variant)
  let changed = true
  while (changed && v) {
    changed = false
    for (const p of phrases) {
      if (!p || p.length < 2) continue
      if (v === p) return ''
      if (v.startsWith(`${p} `)) {
        v = v.slice(p.length).trim()
        changed = true
        break
      }
      if (v.endsWith(` ${p}`)) {
        v = v.slice(0, v.length - p.length).trim()
        changed = true
        break
      }
    }
  }
  return v
}

function displayName(folder, variant) {
  const stripped = stripFolderFromVariant(folder, variant)
  if (!stripped) return folder
  return `${folder} · ${titleCase(stripped)}`
}

function namesFromFile(folder, filename) {
  const base = filename.replace(/\.mp4$/i, '').replace(/&amp;/g, '&').trim()
  let variant = base
  const us = base.indexOf('_')
  if (us >= 0) variant = base.slice(us + 1).trim()
  else {
    const stripped = base.replace(new RegExp(`^${folder}\\s*`, 'i'), '').trim()
    variant = stripped || folder
  }
  variant = variant.replace(/_+$/g, '').trim()
  const oldName = `${folder} · ${titleCase(variant)}`
  const name = displayName(folder, variant)
  return [name, oldName]
}

function listMp4s(root) {
  const out = []
  for (const folder of readdirSync(root, { withFileTypes: true })) {
    if (!folder.isDirectory()) continue
    const dir = path.join(root, folder.name)
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      if (!ent.isFile() || !ent.name.toLowerCase().endsWith('.mp4')) continue
      out.push({ folder: folder.name, filename: ent.name, filePath: path.join(dir, ent.name) })
    }
  }
  return out
}

function normKey(s) {
  return normalizePhrase(s).replace(/[^a-z0-9]+/g, '')
}

function getServiceKey() {
  const keysRaw = execFileSync(
    'npx',
    ['supabase', 'projects', 'api-keys', '--project-ref', PROJECT_REF, '--reveal', '--output', 'json'],
    { encoding: 'utf8', shell: true },
  )
  const keys = JSON.parse(keysRaw.replace(/^[\s\S]*?(\[|\{)/, (_, p) => p))
  const list = Array.isArray(keys) ? keys : keys.keys || keys.api_keys || []
  const service =
    list.find((k) => /service_role/i.test(k.name || k.id || k.type || '')) ||
    list.find((k) => /secret/i.test(k.name || k.id || k.type || '') && !k.disabled)
  const serviceKey = service?.api_key || service?.key || service?.secret
  if (!serviceKey) throw new Error('No service key')
  return serviceKey
}

async function mapPool(items, limit, fn) {
  const ret = []
  let i = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++
      ret[idx] = await fn(items[idx], idx)
    }
  })
  await Promise.all(workers)
  return ret
}

const files = listMp4s(VIDEO_ROOT)
console.log(`Local MP4: ${files.length} in ${VIDEO_ROOT}`)

const serviceKey = getServiceKey()
const supabase = createClient(`https://${PROJECT_REF}.supabase.co`, serviceKey, {
  auth: { persistSession: false },
})

const { data: exercises, error: exErr } = await supabase
  .from('exercises')
  .select('id, name, category, video_url')
  .eq('is_public', true)
if (exErr) throw exErr

const byName = new Map()
const byNorm = new Map()
for (const e of exercises) {
  byName.set(e.name, e)
  byNorm.set(normKey(e.name), e)
}

const pairs = []
const unmatched = []
const usedIds = new Set()

for (const f of files) {
  const candidates = namesFromFile(f.folder, f.filename)
  let ex = null
  for (const n of candidates) {
    ex = byName.get(n)
    if (ex) break
  }
  if (!ex) {
    for (const n of candidates) {
      ex = byNorm.get(normKey(n))
      if (ex) break
    }
  }
  if (!ex) {
    unmatched.push(f)
    continue
  }
  if (usedIds.has(ex.id)) {
    unmatched.push({ ...f, reason: `duplicate match ${ex.name}` })
    continue
  }
  usedIds.add(ex.id)
  pairs.push({ ...f, exercise: ex })
}

const already = pairs.filter((p) => /exercise-videos/.test(p.exercise.video_url || ''))
const todo = pairs.filter((p) => !/exercise-videos/.test(p.exercise.video_url || ''))

console.log(`Matched: ${pairs.length}  already uploaded: ${already.length}  to upload: ${todo.length}  unmatched: ${unmatched.length}`)
if (unmatched.length) {
  for (const u of unmatched.slice(0, 40)) {
    console.log(`  UNMATCH ${u.folder}/${u.filename}${u.reason ? ` (${u.reason})` : ''}`)
  }
}

if (DRY) {
  console.log('Dry run only.')
  process.exit(unmatched.length ? 1 : 0)
}

let ok = 0
let fail = 0
await mapPool(todo, CONCURRENCY, async (p, idx) => {
  const objectPath = `${ADMIN_PREFIX}/${p.exercise.id}/demo.mp4`
  const sizeMb = (statSync(p.filePath).size / (1024 * 1024)).toFixed(1)
  process.stdout.write(`[${idx + 1}/${todo.length}] ${p.exercise.name} (${sizeMb} MB)\n`)
  try {
    const body = readFileSync(p.filePath)
    const { error } = await supabase.storage.from('exercise-videos').upload(objectPath, body, {
      upsert: true,
      contentType: 'video/mp4',
      cacheControl: '31536000',
    })
    if (error) throw error
    const { data } = supabase.storage.from('exercise-videos').getPublicUrl(objectPath)
    const { error: uErr } = await supabase
      .from('exercises')
      .update({ video_url: data.publicUrl })
      .eq('id', p.exercise.id)
    if (uErr) throw uErr
    ok++
  } catch (e) {
    fail++
    console.error(`  FAIL ${p.exercise.name}: ${e.message || e}`)
  }
})

console.log(`Done. ok=${ok} fail=${fail} skipped_already=${already.length} unmatched=${unmatched.length}`)
if (fail || unmatched.length) process.exit(1)
