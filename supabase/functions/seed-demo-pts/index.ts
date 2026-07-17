import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEMO_PASSWORD = 'Leone123!';

interface DemoPt {
  email: string;
  firstName: string;
  lastName: string;
  city: string;
  slug: string;
  bio: string;
  specializations: string[];
  ptTypeName: string;
  ratingAvg: number;
  reviewCount: number;
  locationLat: number;
  locationLng: number;
  templateTitles: string[];
}

const DEMO_PTS: DemoPt[] = [
  {
    email: 'elena.vitale.pt@fitplatform.com',
    firstName: 'Elena',
    lastName: 'Vitale',
    city: 'Milano',
    slug: 'elena-vitale',
    bio:
      'Personal trainer specializzata in pilates e rieducazione posturale. Programmi su misura per donne che vogliono tonificare, migliorare la postura e ritrovare benessere quotidiano.',
    specializations: ['Pilates', 'Posturale', 'Allenamento femminile', 'Functional Training'],
    ptTypeName: 'Pilates',
    ratingAvg: 4.8,
    reviewCount: 14,
    locationLat: 45.4642,
    locationLng: 9.19,
    templateTitles: ['Pilates Core & Postura', 'Functional Donna — Full Body'],
  },
  {
    email: 'davide.russo.pt@fitplatform.com',
    firstName: 'Davide',
    lastName: 'Russo',
    city: 'Roma',
    slug: 'davide-russo',
    bio:
      'Coach CrossFit e HIIT con background in preparazione atletica. Sessioni ad alta intensità per atleti intermedi e avanzati che vogliono spingersi oltre.',
    specializations: ['CrossFit', 'HIIT', 'Preparazione atletica', 'Conditioning'],
    ptTypeName: 'CrossFit',
    ratingAvg: 4.9,
    reviewCount: 22,
    locationLat: 41.9028,
    locationLng: 12.4964,
    templateTitles: ['CrossFit WOD — For Time', 'HIIT Metcon 20 min'],
  },
  {
    email: 'chiara.lombardi.pt@fitplatform.com',
    firstName: 'Chiara',
    lastName: 'Lombardi',
    city: 'Torino',
    slug: 'chiara-lombardi',
    bio:
      'Strength coach e consulente nutrizionale sportivo. Percorsi strutturati per principianti: costruire forza, imparare i movimenti base e abbinare alimentazione all\'allenamento.',
    specializations: ['Strength', 'Nutrizione sportiva', 'Principianti', 'Ipertrofia'],
    ptTypeName: 'Functional Training',
    ratingAvg: 4.7,
    reviewCount: 11,
    locationLat: 45.0703,
    locationLng: 7.6869,
    templateTitles: ['Strength Base — Principianti', 'Forza + Nutrizione — Settimana 1'],
  },
];

async function requireAdmin(
  authHeader: string,
  supabaseUrl: string,
  anonKey: string,
  serviceKey: string,
): Promise<{ ok: true; callerId: string } | { ok: false; status: number; error: string }> {
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace('Bearer ', '');
  const { data: claims, error: claimsError } = await authClient.auth.getClaims(token);
  if (claimsError || !claims?.claims?.sub) {
    return { ok: false, status: 401, error: 'Invalid token' };
  }

  const callerId = claims.claims.sub as string;
  const admin = createClient(supabaseUrl, serviceKey);
  const { data: adminRole } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', callerId)
    .eq('role', 'admin')
    .maybeSingle();

  if (!adminRole) {
    return { ok: false, status: 403, error: 'Forbidden — admin access required' };
  }

  return { ok: true, callerId };
}

async function ensureAuthUser(
  admin: ReturnType<typeof createClient>,
  email: string,
): Promise<{ userId: string; created: boolean }> {
  const normalizedEmail = email.trim().toLowerCase();

  const { data: existingId, error: lookupError } = await admin.rpc('get_auth_user_id_by_email', {
    _email: normalizedEmail,
  });

  if (lookupError) {
    throw lookupError;
  }

  if (existingId) {
    return { userId: existingId as string, created: false };
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { role: 'pt' },
  });

  if (authError) {
    if (authError.message.toLowerCase().includes('already')) {
      const { data: retryId } = await admin.rpc('get_auth_user_id_by_email', {
        _email: normalizedEmail,
      });
      if (retryId) {
        return { userId: retryId as string, created: false };
      }
    }
    throw authError;
  }

  return { userId: authData.user.id, created: true };
}

async function upsertPtSeed(admin: ReturnType<typeof createClient>, pt: DemoPt) {
  const { data, error } = await admin.rpc('upsert_demo_pt_seed', {
    _email: pt.email,
    _first_name: pt.firstName,
    _last_name: pt.lastName,
    _city: pt.city,
    _slug: pt.slug,
    _bio: pt.bio,
    _specializations: pt.specializations,
    _pt_type_name: pt.ptTypeName,
    _rating_avg: pt.ratingAvg,
    _review_count: pt.reviewCount,
    _location_lat: pt.locationLat,
    _location_lng: pt.locationLng,
    _max_athletes: 20,
    _template_titles: pt.templateTitles,
  });

  if (error) throw error;
  return data as Record<string, unknown>;
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

    const auth = await requireAdmin(authHeader, supabaseUrl, anonKey, serviceKey);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const results: Array<Record<string, unknown>> = [];
    const created: string[] = [];
    const skipped: string[] = [];

    for (const pt of DEMO_PTS) {
      const { userId, created: authCreated } = await ensureAuthUser(admin, pt.email);
      const seedResult = await upsertPtSeed(admin, pt);

      if (authCreated) {
        created.push(pt.email);
      } else {
        skipped.push(pt.email);
      }

      results.push({
        email: pt.email,
        password: DEMO_PASSWORD,
        slug: pt.slug,
        user_id: userId,
        auth_created: authCreated,
        ...seedResult,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        password: DEMO_PASSWORD,
        created_auth_users: created,
        skipped_existing_auth_users: skipped,
        pts: results,
        note: 'Marco Ferrari (76c207f5...) was not modified — use seed-marco-ferrari-demo separately.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('seed-demo-pts error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
