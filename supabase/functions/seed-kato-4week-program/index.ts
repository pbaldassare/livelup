import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ATHLETE_EMAIL = 'kato.aifp@gmail.com';
const PT_FALLBACK = '76c207f5-ba7d-48d7-a7f2-c95f4819aebd';
const PROGRAM_NAME = 'Demo 4 settimane — 3 tipologie';
const SEED_TAG = '[seed:kato-4w-kinds]';

type Kind = 'libera' | 'propedeutica' | 'progressiva';

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function activeDates(start: Date, activeDays: number[], weeks: number) {
  const s = new Date(start);
  s.setHours(12, 0, 0, 0);
  const dates = [new Date(s)];
  const end = addDays(s, weeks * 7);
  const cursor = addDays(s, 1);
  while (cursor < end) {
    const js = cursor.getDay();
    const isoDay = js === 0 ? 7 : js;
    if (activeDays.includes(isoDay)) dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

async function upsertTemplate(
  admin: ReturnType<typeof createClient>,
  ptUserId: string,
  title: string,
  kind: Kind,
  description: string,
  exerciseIds: string[],
) {
  const { data: existing } = await admin
    .from('workout_templates')
    .select('id')
    .eq('pt_user_id', ptUserId)
    .eq('title', title)
    .maybeSingle();

  let templateId = existing?.id as string | undefined;
  if (!templateId) {
    const { data, error } = await admin
      .from('workout_templates')
      .insert({
        pt_user_id: ptUserId,
        title,
        description: `${SEED_TAG} ${description}`,
        category: 'funzionale',
        difficulty_level: 'intermedio',
        estimated_duration: 35,
        is_public: false,
        tags: ['seed', 'kato', kind],
        template_kind: kind,
      } as never)
      .select('id')
      .single();
    if (error) throw error;
    templateId = data.id;
  } else {
    const { error } = await admin
      .from('workout_templates')
      .update({
        template_kind: kind,
        description: `${SEED_TAG} ${description}`,
      } as never)
      .eq('id', templateId);
    if (error) throw error;
    await admin.from('template_exercises').delete().eq('template_id', templateId);
  }

  const reps = kind === 'progressiva' ? { min: 8, max: 8 } : { min: 10, max: 12 };
  const rows = exerciseIds.slice(0, 3).map((exercise_id, i) => ({
    template_id: templateId!,
    exercise_id,
    order_index: i + 1,
    sets: 3,
    reps_min: reps.min,
    reps_max: reps.max,
    rest_seconds: 60,
    protocol_type: 'SET',
    protocol_params: {},
  }));
  const { error: exErr } = await admin.from('template_exercises').insert(rows);
  if (exErr) throw exErr;
  return templateId!;
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
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: adminRole } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole && callerId !== PT_FALLBACK) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: athlete, error: athErr } = await admin
      .from('profiles')
      .select('user_id, email')
      .ilike('email', ATHLETE_EMAIL)
      .maybeSingle();
    if (athErr || !athlete) {
      return new Response(JSON.stringify({ error: 'Athlete not found', details: athErr?.message }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: conn } = await admin
      .from('pt_atleta_connections')
      .select('pt_user_id')
      .eq('atleta_user_id', athlete.user_id)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let ptUserId = conn?.pt_user_id as string | undefined;
    if (!ptUserId) {
      ptUserId = PT_FALLBACK;
      const { error: cErr } = await admin.from('pt_atleta_connections').upsert(
        {
          pt_user_id: ptUserId,
          atleta_user_id: athlete.user_id,
          status: 'active',
          requested_by: ptUserId,
          accepted_at: new Date().toISOString(),
          terminated_at: null,
        },
        { onConflict: 'pt_user_id,atleta_user_id' },
      );
      if (cErr) throw cErr;
    }

    const { data: exercises, error: exCatErr } = await admin
      .from('exercises')
      .select('id, name')
      .order('name')
      .limit(20);
    if (exCatErr) throw exCatErr;
    const ids = (exercises || []).map((e) => e.id);
    if (ids.length < 3) throw new Error('Servono almeno 3 esercizi in catalogo');
    while (ids.length < 9) ids.push(ids[0]);

    const a = ids.slice(0, 3);
    const b = ids.slice(3, 6);
    const c = ids.slice(6, 9);

    const tplLibera = await upsertTemplate(
      admin,
      ptUserId,
      'A — Full Body Libera',
      'libera',
      'Scheda libera: puoi riordinare gli esercizi prima di partire.',
      a,
    );
    const tplProp = await upsertTemplate(
      admin,
      ptUserId,
      'B — Full Body Propedeutica',
      'propedeutica',
      'Scheda propedeutica: ordine fisso, puoi continuare anche se incompleta.',
      b,
    );
    const tplProg = await upsertTemplate(
      admin,
      ptUserId,
      'C — Full Body Progressiva',
      'progressiva',
      'Scheda progressiva: completa al 100% ogni esercizio prima del successivo.',
      c,
    );

    const { data: oldPrograms } = await admin
      .from('workout_programs')
      .select('id')
      .eq('pt_user_id', ptUserId)
      .eq('name', PROGRAM_NAME)
      .eq('is_archived', false);

    for (const p of oldPrograms || []) {
      await admin
        .from('program_assignments')
        .update({ status: 'cancelled' })
        .eq('program_id', p.id)
        .eq('atleta_user_id', athlete.user_id)
        .eq('status', 'active');
      await admin.from('workout_programs').update({ is_archived: true }).eq('id', p.id);
    }

    const { data: oldWorkouts } = await admin
      .from('workouts')
      .select('id')
      .eq('atleta_user_id', athlete.user_id)
      .eq('pt_user_id', ptUserId)
      .eq('description', SEED_TAG);
    const oldIds = (oldWorkouts || []).map((w) => w.id);
    if (oldIds.length) {
      await admin.from('workout_exercises').delete().in('workout_id', oldIds);
      await admin.from('workouts').delete().in('id', oldIds);
    }

    const activeDays = [1, 3, 5];
    const { data: program, error: progErr } = await admin
      .from('workout_programs')
      .insert({
        pt_user_id: ptUserId,
        name: PROGRAM_NAME,
        description: `${SEED_TAG} Rotazione A libera → B propedeutica → C progressiva, 3×/settimana × 4 settimane.`,
        duration_weeks: 4,
        frequency_per_week: 3,
        active_days: activeDays,
        mode: 'recurring',
        notes: SEED_TAG,
      })
      .select('id')
      .single();
    if (progErr) throw progErr;

    const { error: schErr } = await admin.from('program_schedules').insert([
      { program_id: program.id, template_id: tplLibera, day_of_week: 1, week_offset: 0, order_index: 0 },
      { program_id: program.id, template_id: tplProp, day_of_week: 1, week_offset: 0, order_index: 1 },
      { program_id: program.id, template_id: tplProg, day_of_week: 1, week_offset: 0, order_index: 2 },
    ]);
    if (schErr) throw schErr;

    const startDate = new Date();
    startDate.setHours(12, 0, 0, 0);
    const endDate = addDays(startDate, 4 * 7 - 1);

    const { data: assignment, error: asgErr } = await admin
      .from('program_assignments')
      .insert({
        program_id: program.id,
        pt_user_id: ptUserId,
        atleta_user_id: athlete.user_id,
        start_date: iso(startDate),
        end_date: iso(endDate),
        weeks_generated: 4,
        current_index: 0,
        active_days: activeDays,
        status: 'active',
        notes: SEED_TAG,
      })
      .select('id')
      .single();
    if (asgErr) throw asgErr;

    const rotation = [
      { id: tplLibera, kind: 'libera' as Kind, title: 'A — Full Body Libera' },
      { id: tplProp, kind: 'propedeutica' as Kind, title: 'B — Full Body Propedeutica' },
      { id: tplProg, kind: 'progressiva' as Kind, title: 'C — Full Body Progressiva' },
    ];

    const payloads: Record<string, Array<Record<string, unknown>>> = {};
    for (const t of rotation) {
      const { data: rows, error } = await admin
        .from('template_exercises')
        .select(
          'exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes, protocol_type, protocol_params',
        )
        .eq('template_id', t.id)
        .order('order_index');
      if (error) throw error;
      payloads[t.id] = rows || [];
    }

    const dates = activeDates(startDate, activeDays, 4);
    let created = 0;
    for (let i = 0; i < dates.length; i++) {
      const tpl = rotation[i % rotation.length];
      const { data: workout, error: wErr } = await admin
        .from('workouts')
        .insert({
          atleta_user_id: athlete.user_id,
          pt_user_id: ptUserId,
          title: tpl.title,
          description: SEED_TAG,
          template_id: tpl.id,
          template_kind: tpl.kind,
          scheduled_date: iso(dates[i]),
          due_date: iso(dates[i]),
          status: 'attivo',
        } as never)
        .select('id')
        .single();
      if (wErr) throw wErr;

      const inserts = (payloads[tpl.id] || []).map((e) => ({
        workout_id: workout.id,
        exercise_id: e.exercise_id,
        order_index: e.order_index,
        prescribed_sets: e.sets,
        prescribed_reps_min: e.reps_min,
        prescribed_reps_max: e.reps_max,
        rest_seconds: e.rest_seconds ?? 60,
        notes: e.notes,
        protocol_type: e.protocol_type || 'SET',
        protocol_params: e.protocol_params || {},
      }));
      const { error: weErr } = await admin.from('workout_exercises').insert(inserts);
      if (weErr) throw weErr;
      created += 1;
    }

    await admin
      .from('program_assignments')
      .update({ current_index: dates.length % 3, weeks_generated: 4 })
      .eq('id', assignment.id);

    await admin.from('notifications').insert({
      user_id: athlete.user_id,
      type: 'program_assigned',
      title: 'Nuovo programma di allenamento!',
      body: `Il tuo Coach ti ha assegnato il programma "${PROGRAM_NAME}"`,
      action_url: '/app/scheda',
      data: { pt_user_id: ptUserId, program_id: program.id },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        athlete: athlete.email,
        pt_user_id: ptUserId,
        program_id: program.id,
        assignment_id: assignment.id,
        workouts_created: created,
        templates: rotation,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('seed-kato-4week-program error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
