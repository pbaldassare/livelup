import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PT_USER_ID = '76c207f5-ba7d-48d7-a7f2-c95f4819aebd';
const SEED_TAG = '[seed:marco-demo]';

interface AthleteRow {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function isKato(a: AthleteRow) {
  return (a.first_name ?? '').toLowerCase().includes('kato')
    || (a.last_name ?? '').toLowerCase().includes('aifp');
}

async function resolveAthletes(supabase: ReturnType<typeof createClient>) {
  const { data: connections, error: connErr } = await supabase
    .from('pt_atleta_connections')
    .select('atleta_user_id')
    .eq('pt_user_id', PT_USER_ID)
    .eq('status', 'active');

  if (connErr) throw connErr;
  const ids = (connections ?? []).map((c) => c.atleta_user_id);
  if (ids.length === 0) return [];

  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name')
    .in('user_id', ids);

  if (profErr) throw profErr;

  const all = (profiles ?? []) as AthleteRow[];
  const named = all.filter((a) =>
    ((a.first_name ?? '').toLowerCase() === 'giulia' && (a.last_name ?? '').toLowerCase().startsWith('rossi'))
    || isKato(a),
  );

  return named.length > 0 ? named.slice(0, 5) : all.slice(0, 5);
}

async function ensurePackage(supabase: ReturnType<typeof createClient>) {
  const { data: existing } = await supabase
    .from('pt_packages')
    .select('id')
    .eq('pt_user_id', PT_USER_ID)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created, error } = await supabase
    .from('pt_packages')
    .insert({
      pt_user_id: PT_USER_ID,
      name: 'Pacchetto 10 sessioni',
      description: 'Allenamento personalizzato con follow-up settimanale',
      package_type: 'sessioni',
      price: 150,
      currency: 'EUR',
      sessions_count: 10,
      duration_days: 90,
      is_active: true,
      includes_chat: true,
    })
    .select('id')
    .single();

  if (error) throw error;
  return created.id as string;
}

async function seedProgress(
  supabase: ReturnType<typeof createClient>,
  athlete: AthleteRow,
  index: number,
) {
  const { count } = await supabase
    .from('progress_tracking')
    .select('id', { count: 'exact', head: true })
    .eq('atleta_user_id', athlete.user_id)
    .like('notes', `${SEED_TAG}%`);

  if ((count ?? 0) > 0) return 0;

  const entries = [];
  const kato = isKato(athlete);
  const weeks = kato ? 10 : 12;
  let weight = kato ? 83.5 : 68.8;

  for (let i = 0; i < weeks; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (weeks - 1 - i) * 7);
    weight += kato ? (Math.random() * 0.4 - 0.2) : -(Math.random() * 0.25);

    entries.push({
      atleta_user_id: athlete.user_id,
      tracked_date: date.toISOString().slice(0, 10),
      weight_kg: round1(weight),
      body_fat_percentage: round1(kato ? 16.5 + Math.random() * 1.2 : 28 - i * 0.35 + Math.random() * 0.3),
      energy_level: Math.min(10, 4 + Math.floor(i / 3)),
      mood_level: Math.min(10, 4 + Math.floor(i / 4)),
      sleep_hours: round1(kato ? 7 + Math.random() : 6.5 + Math.random() * 1.5),
      sleep_quality: Math.min(10, (kato ? 4 : 3) + Math.floor(i / (kato ? 5 : 4))),
      waist_cm: round1(kato ? 86 - i * 0.15 : 78 - i * 0.4),
      ...(kato
        ? { chest_cm: round1(102 + i * 0.1) }
        : { hips_cm: round1(98 - i * 0.2) }),
      notes: i === weeks - 1
        ? `${SEED_TAG} ${kato ? 'Buon progresso sulle trazioni.' : 'Obiettivo -3kg quasi raggiunto!'}`
        : SEED_TAG,
    });
  }

  const { error } = await supabase.from('progress_tracking').insert(entries);
  if (error) throw error;
  return entries.length;
}

async function seedSubscription(
  supabase: ReturnType<typeof createClient>,
  athlete: AthleteRow,
  packageId: string,
  index: number,
) {
  const { count } = await supabase
    .from('atleta_pt_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('atleta_user_id', athlete.user_id)
    .eq('pt_user_id', PT_USER_ID)
    .like('notes', `${SEED_TAG}%`);

  if ((count ?? 0) > 0) return 0;

  const now = Date.now();
  const expiringSoon = index === 0;

  const { error } = await supabase.from('atleta_pt_subscriptions').insert({
    atleta_user_id: athlete.user_id,
    pt_user_id: PT_USER_ID,
    package_id: packageId,
    status: 'attivo',
    price_paid: expiringSoon ? 150 : 120,
    currency: 'EUR',
    sessions_total: 10,
    sessions_used: expiringSoon ? 4 : 7,
    started_at: new Date(now - 45 * 86400000).toISOString(),
    expires_at: new Date(now + (expiringSoon ? 10 : 60) * 86400000).toISOString(),
    auto_renew: true,
    notes: `${SEED_TAG} Abbonamento demo`,
  });

  if (error) throw error;
  return 1;
}

async function seedPayments(supabase: ReturnType<typeof createClient>) {
  const { count } = await supabase
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', PT_USER_ID)
    .like('description', `${SEED_TAG}%`);

  if ((count ?? 0) > 0) return 0;

  const now = Date.now();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const rows = [
    {
      user_id: PT_USER_ID,
      amount: 99,
      currency: 'EUR',
      status: 'completed',
      payment_method: 'stripe',
      description: `${SEED_TAG} Abbonamento Pro — luglio`,
      paid_at: new Date(monthStart.getTime() + 3 * 86400000).toISOString(),
      created_at: new Date(now - 11 * 86400000).toISOString(),
    },
    {
      user_id: PT_USER_ID,
      amount: 149,
      currency: 'EUR',
      status: 'completed',
      payment_method: 'bank_transfer',
      description: `${SEED_TAG} Upgrade piano Premium`,
      paid_at: new Date(monthStart.getTime() + 8 * 86400000).toISOString(),
      created_at: new Date(now - 6 * 86400000).toISOString(),
    },
    {
      user_id: PT_USER_ID,
      amount: 79,
      currency: 'EUR',
      status: 'pending',
      payment_method: 'stripe',
      description: `${SEED_TAG} Rinnovo add-on Analytics`,
      paid_at: null,
      created_at: new Date(now - 2 * 86400000).toISOString(),
    },
    {
      user_id: PT_USER_ID,
      amount: 59,
      currency: 'EUR',
      status: 'pending',
      payment_method: 'paypal',
      description: `${SEED_TAG} Corso CEU online`,
      paid_at: null,
      created_at: new Date(now - 1 * 86400000).toISOString(),
    },
  ];

  const { error } = await supabase.from('payments').insert(rows);
  if (error) throw error;
  return rows.length;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerId = claims.claims.sub as string;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: adminRole } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
      .eq('role', 'admin')
      .maybeSingle();

    const isSelfPt = callerId === PT_USER_ID;
    if (!adminRole && !isSelfPt) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: ptProfile } = await admin
      .from('profiles')
      .select('user_id, first_name, last_name, email')
      .eq('user_id', PT_USER_ID)
      .maybeSingle();

    if (!ptProfile) {
      return new Response(JSON.stringify({
        error: 'PT Marco Ferrari not found',
        pt_user_id: PT_USER_ID,
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const athletes = await resolveAthletes(admin);
    const packageId = await ensurePackage(admin);

    let progressEntries = 0;
    let subscriptions = 0;
    for (let i = 0; i < athletes.length; i++) {
      progressEntries += await seedProgress(admin, athletes[i], i);
      subscriptions += await seedSubscription(admin, athletes[i], packageId, i);
    }
    const payments = await seedPayments(admin);

    const summary = {
      pt: ptProfile,
      athletes: athletes.map((a) => ({
        user_id: a.user_id,
        name: [a.first_name, a.last_name].filter(Boolean).join(' '),
      })),
      inserted: {
        progress_entries: progressEntries,
        subscriptions,
        payments,
      },
      seed_tag: SEED_TAG,
    };

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('seed-marco-ferrari-demo error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
