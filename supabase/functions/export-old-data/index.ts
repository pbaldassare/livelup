// One-shot export of the old Lovable Cloud backend, pulled by
// migration.fetch_old_snapshot() on kxgaqnksylntokyrpaxp.
// Returns every public table, auth.users/identities (with password hashes,
// so logins keep working) and the storage object list.
// Protected by a token whose SHA-256 is pinned below. Delete this function
// once the migration is done.
import postgres from 'npm:postgres@3.4.5';
import { createClient } from 'npm:@supabase/supabase-js@2';

const TOKEN_SHA256 = '694283e420876bb58e675bdc74c524605534a90361a5a030e22cff6cd9a016cf';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function exportViaDb(dbUrl: string) {
  const sql = postgres(dbUrl, { prepare: false, max: 1 });
  try {
    const tables = await sql<{ table_name: string }[]>`
      select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
      order by table_name`;
    const pub: Record<string, unknown> = {};
    for (const { table_name } of tables) {
      const [{ rows }] = await sql.unsafe(
        `select coalesce(json_agg(x), '[]'::json) as rows from public."${table_name.replace(/"/g, '""')}" x`,
      );
      pub[table_name] = rows;
    }
    const [{ rows: users }] = await sql`select coalesce(json_agg(x), '[]'::json) as rows from auth.users x`;
    const [{ rows: identities }] =
      await sql`select coalesce(json_agg(x), '[]'::json) as rows from auth.identities x`;
    const [{ rows: objects }] = await sql`
      select coalesce(json_agg(x), '[]'::json) as rows from (
        select bucket_id, name, owner, metadata, created_at, updated_at from storage.objects
      ) x`;
    return { mode: 'db', public: pub, auth: { users, identities }, storage_objects: objects };
  } finally {
    await sql.end();
  }
}

async function exportViaServiceRole(url: string, serviceKey: string) {
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const spec = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  }).then((r) => r.json());
  const tableNames = Object.keys(spec?.definitions ?? {}).sort();
  const pub: Record<string, unknown[]> = {};
  for (const table of tableNames) {
    const rows: unknown[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin.from(table).select('*').range(from, from + 999);
      if (error) break;
      rows.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    pub[table] = rows;
  }
  const users: unknown[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data?.users?.length) break;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return { mode: 'service_role', public: pub, auth: { users, identities: [] }, storage_objects: [] };
}

Deno.serve(async (req) => {
  const token = req.headers.get('x-export-token') ?? '';
  if (!token || !safeEqual(await sha256Hex(token), TOKEN_SHA256)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  try {
    const dbUrl = Deno.env.get('SUPABASE_DB_URL');
    const body = dbUrl
      ? await exportViaDb(dbUrl)
      : await exportViaServiceRole(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );
    return json({
      generated_at: new Date().toISOString(),
      source: Deno.env.get('SUPABASE_URL'),
      ...body,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
