/**
 * Ensures Supabase Auth redirect allowlist includes fixed + Pages preview patterns.
 * Uses Supabase Management API: GET/PATCH /v1/projects/:ref/config/auth
 *
 * Env:
 *   SUPABASE_ACCESS_TOKEN — Personal Access Token with auth_config_read + auth_config_write
 *   SUPABASE_PROJECT_REF   — default: kxgaqnksylntokyrpaxp (Livelapp EU)
 *
 * Does not print secrets. Idempotent: merges into uri_allow_list, preserves existing entries.
 */
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'kxgaqnksylntokyrpaxp';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

/** Always ensure these patterns exist (comma-separated list on Supabase side becomes CSV here). */
const REQUIRED_URIS = [
  'https://livelup.pages.dev/**',
  'https://*.livelup.pages.dev/**',
];

const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;

function parseAllowList(raw) {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function main() {
  if (!TOKEN) {
    console.error('Missing SUPABASE_ACCESS_TOKEN');
    process.exit(1);
  }

  const getReq = {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  fetch(API, getReq)
    .then(async (res) => {
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`GET auth config failed: ${res.status} ${t}`);
      }
      return res.json();
    })
    .then(async (cfg) => {
      const current = parseAllowList(cfg.uri_allow_list);
      const merged = [...current];
      let changed = false;
      for (const u of REQUIRED_URIS) {
        if (!merged.includes(u)) {
          merged.push(u);
          changed = true;
        }
      }
      if (!changed) {
        console.log('Supabase Auth uri_allow_list already includes required Pages URLs. No update.');
        return;
      }
      const body = {
        uri_allow_list: merged.join(','),
      };
      const patchRes = await fetch(API, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!patchRes.ok) {
        const t = await patchRes.text();
        throw new Error(`PATCH auth config failed: ${patchRes.status} ${t}`);
      }
      console.log('Updated Supabase Auth uri_allow_list (merged required Pages URLs).');
    })
    .catch((err) => {
      console.error(err.message || err);
      process.exit(1);
    });
}

main();
