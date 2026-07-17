/**
 * Seed: programma 4 settimane per kato.aifp@gmail.com
 * con le 3 tipologie di scheda (libera / propedeutica / progressiva).
 *
 * Uso:
 *   node --env-file=.env scripts/seed-kato-4week-program.mjs
 *
 * Auth: login PT Marco Ferrari (demo) oppure PT attivo collegato all'atleta.
 */
import { createClient } from '@supabase/supabase-js';

const ATHLETE_EMAIL = 'kato.aifp@gmail.com';
const PT_EMAIL = process.env.SEED_PT_EMAIL || 'marco.ferrari.pt@gmail.com';
const PT_PASSWORD = process.env.SEED_PT_PASSWORD || 'Leone123!';
const PROGRAM_NAME = 'Demo 4 settimane — 3 tipologie';
const SEED_TAG = '[seed:kato-4w-kinds]';

const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !anon) {
  console.error('Mancano VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY nel .env');
  process.exit(1);
}

const supabase = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

async function findExerciseIds() {
  const patterns = [
    ['squat', '%squat%', '%jump%'],
    ['pushup', '%push%', null],
    ['plank', '%plank%', null],
    ['row', '%remat%', null],
    ['lunge', '%affond%', null],
    ['deadlift', '%stacc%', null],
    ['bench', '%panca%', null],
    ['crunch', '%crunch%', null],
    ['pullup', '%trazi%', null],
  ];

  const { data, error } = await supabase
    .from('exercises')
    .select('id, name')
    .limit(200);
  if (error) throw error;
  const all = data || [];

  const pick = (include, exclude) => {
    const hit = all.find((e) => {
      const n = (e.name || '').toLowerCase();
      const okInc = include.some((p) => n.includes(p.replace(/%/g, '')));
      const bad = exclude && exclude.some((p) => n.includes(p.replace(/%/g, '')));
      return okInc && !bad;
    });
    return hit?.id ?? null;
  };

  // fallback: any 9 distinct
  const ids = [];
  const used = new Set();
  for (const [, incRaw, exclRaw] of patterns) {
    const inc = [incRaw.replace(/%/g, '')];
    const excl = exclRaw ? [exclRaw.replace(/%/g, '')] : null;
    let id = pick(inc, excl);
    if (!id) {
      const fallback = all.find((e) => !used.has(e.id));
      id = fallback?.id ?? null;
    }
    if (id) used.add(id);
    ids.push(id);
  }

  if (ids.filter(Boolean).length < 3) {
    throw new Error('Servono almeno 3 esercizi in catalogo');
  }
  // pad with first available
  while (ids.filter(Boolean).length < 9) {
    const f = all.find((e) => !used.has(e.id));
    if (!f) break;
    used.add(f.id);
    const idx = ids.findIndex((x) => !x);
    if (idx >= 0) ids[idx] = f.id;
    else ids.push(f.id);
  }

  return {
    a: [ids[0], ids[1], ids[2]].filter(Boolean),
    b: [ids[3] || ids[0], ids[4] || ids[1], ids[5] || ids[2]].filter(Boolean),
    c: [ids[6] || ids[0], ids[7] || ids[1], ids[8] || ids[2]].filter(Boolean),
    names: Object.fromEntries(all.map((e) => [e.id, e.name])),
  };
}

async function upsertTemplate(ptUserId, { title, kind, description, exerciseIds, names }) {
  const { data: existing } = await supabase
    .from('workout_templates')
    .select('id')
    .eq('pt_user_id', ptUserId)
    .eq('title', title)
    .maybeSingle();

  let templateId = existing?.id;
  if (!templateId) {
    const { data, error } = await supabase
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
      })
      .select('id')
      .single();
    if (error) throw error;
    templateId = data.id;
  } else {
    const { error } = await supabase
      .from('workout_templates')
      .update({ template_kind: kind, description: `${SEED_TAG} ${description}` })
      .eq('id', templateId);
    if (error) throw error;
    await supabase.from('template_exercises').delete().eq('template_id', templateId);
  }

  const rows = exerciseIds.slice(0, 3).map((exerciseId, i) => ({
    template_id: templateId,
    exercise_id: exerciseId,
    order_index: i + 1,
    sets: 3,
    reps_min: kind === 'progressiva' ? 8 : 10,
    reps_max: kind === 'progressiva' ? 8 : 12,
    rest_seconds: 60,
    notes: names[exerciseId] ? `Focus: ${names[exerciseId]}` : null,
    protocol_type: 'SET',
    protocol_params: {},
  }));

  const { error: exErr } = await supabase.from('template_exercises').insert(rows);
  if (exErr) throw exErr;

  return templateId;
}

async function loadTemplatePayload(templateId) {
  const { data: exRows, error } = await supabase
    .from('template_exercises')
    .select(
      'exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes, prescribed_duration_seconds, sets_data, protocol_type, protocol_params',
    )
    .eq('template_id', templateId)
    .order('order_index');
  if (error) throw error;

  return (exRows || []).map((e) => ({
    exerciseId: e.exercise_id,
    orderIndex: e.order_index,
    prescribedSets: e.sets,
    prescribedRepsMin: e.reps_min,
    prescribedRepsMax: e.reps_max,
    prescribedDurationSeconds: e.prescribed_duration_seconds,
    restSeconds: e.rest_seconds ?? 60,
    notes: e.notes,
    setsData: e.sets_data,
    protocolType: e.protocol_type || 'SET',
    protocolParams: e.protocol_params || {},
  }));
}

async function createWorkoutFromTemplate({
  atletaUserId,
  ptUserId,
  templateId,
  title,
  templateKind,
  scheduledDate,
  exercises,
}) {
  const { data: workout, error } = await supabase
    .from('workouts')
    .insert({
      atleta_user_id: atletaUserId,
      pt_user_id: ptUserId,
      title,
      description: SEED_TAG,
      template_id: templateId,
      template_kind: templateKind,
      scheduled_date: scheduledDate,
      due_date: scheduledDate,
      status: 'attivo',
    })
    .select('id')
    .single();
  if (error) throw error;

  const inserts = exercises.map((ex) => ({
    workout_id: workout.id,
    exercise_id: ex.exerciseId,
    order_index: ex.orderIndex,
    prescribed_sets: ex.prescribedSets,
    prescribed_reps_min: ex.prescribedRepsMin ?? null,
    prescribed_reps_max: ex.prescribedRepsMax ?? null,
    prescribed_duration_seconds: ex.prescribedDurationSeconds ?? null,
    rest_seconds: ex.restSeconds ?? 60,
    notes: ex.notes ?? null,
    sets_data: ex.setsData ?? null,
    protocol_type: ex.protocolType || 'SET',
    protocol_params: ex.protocolParams || {},
  }));

  const { error: weErr } = await supabase.from('workout_exercises').insert(inserts);
  if (weErr) {
    await supabase.from('workouts').delete().eq('id', workout.id);
    throw weErr;
  }
  return workout.id;
}

/** Date attive: startDate + lun/mer/ven nelle 4 settimane */
function computeScheduleDates(startDate, activeDays, weeks) {
  const start = new Date(startDate);
  start.setHours(12, 0, 0, 0);
  const dates = [new Date(start)];
  const end = addDays(start, weeks * 7);
  const cursor = addDays(start, 1);
  while (cursor < end) {
    const jsDay = cursor.getDay();
    const isoDay = jsDay === 0 ? 7 : jsDay;
    if (activeDays.includes(isoDay)) dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

async function main() {
  console.log('Login PT…', PT_EMAIL);
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: PT_EMAIL,
    password: PT_PASSWORD,
  });
  if (authErr) throw new Error(`Login PT fallito: ${authErr.message}`);
  const ptUserId = auth.user.id;
  console.log('PT user_id:', ptUserId);

  const { data: athleteProfile, error: athErr } = await supabase
    .from('profiles')
    .select('user_id, email, first_name, last_name')
    .ilike('email', ATHLETE_EMAIL)
    .maybeSingle();
  if (athErr) throw athErr;
  if (!athleteProfile) throw new Error(`Atleta non trovato: ${ATHLETE_EMAIL}`);
  const atletaUserId = athleteProfile.user_id;
  console.log('Atleta:', athleteProfile.email, atletaUserId);

  // Assicura connessione attiva
  const { data: conn } = await supabase
    .from('pt_atleta_connections')
    .select('id, status')
    .eq('pt_user_id', ptUserId)
    .eq('atleta_user_id', atletaUserId)
    .maybeSingle();

  if (!conn) {
    const { error } = await supabase.from('pt_atleta_connections').insert({
      pt_user_id: ptUserId,
      atleta_user_id: atletaUserId,
      status: 'active',
      requested_by: ptUserId,
      accepted_at: new Date().toISOString(),
    });
    if (error) throw new Error(`Connessione: ${error.message}`);
  } else if (conn.status !== 'active') {
    const { error } = await supabase
      .from('pt_atleta_connections')
      .update({ status: 'active', terminated_at: null, accepted_at: new Date().toISOString() })
      .eq('id', conn.id);
    if (error) throw new Error(`Riattiva connessione: ${error.message}`);
  }

  const catalog = await findExerciseIds();
  console.log('Esercizi scelti A/B/C:', {
    A: catalog.a.map((id) => catalog.names[id]),
    B: catalog.b.map((id) => catalog.names[id]),
    C: catalog.c.map((id) => catalog.names[id]),
  });

  const tplLibera = await upsertTemplate(ptUserId, {
    title: 'A — Full Body Libera',
    kind: 'libera',
    description: 'Scheda libera: puoi riordinare gli esercizi prima di partire.',
    exerciseIds: catalog.a,
    names: catalog.names,
  });
  const tplProp = await upsertTemplate(ptUserId, {
    title: 'B — Full Body Propedeutica',
    kind: 'propedeutica',
    description: 'Scheda propedeutica: ordine fisso, puoi continuare anche se incompleta.',
    exerciseIds: catalog.b,
    names: catalog.names,
  });
  const tplProg = await upsertTemplate(ptUserId, {
    title: 'C — Full Body Progressiva',
    kind: 'progressiva',
    description: 'Scheda progressiva: completa al 100% ogni esercizio prima del successivo.',
    exerciseIds: catalog.c,
    names: catalog.names,
  });
  console.log('Templates:', { tplLibera, tplProp, tplProg });

  // Archivia eventuale programma seed precedente attivo
  const { data: oldPrograms } = await supabase
    .from('workout_programs')
    .select('id')
    .eq('pt_user_id', ptUserId)
    .eq('name', PROGRAM_NAME)
    .eq('is_archived', false);

  for (const p of oldPrograms || []) {
    await supabase
      .from('program_assignments')
      .update({ status: 'cancelled' })
      .eq('program_id', p.id)
      .eq('atleta_user_id', atletaUserId)
      .eq('status', 'active');
    await supabase.from('workout_programs').update({ is_archived: true }).eq('id', p.id);
  }

  const activeDays = [1, 3, 5]; // lun mer ven
  const { data: program, error: progErr } = await supabase
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

  const schedules = [
    { program_id: program.id, template_id: tplLibera, day_of_week: 1, week_offset: 0, order_index: 0 },
    { program_id: program.id, template_id: tplProp, day_of_week: 1, week_offset: 0, order_index: 1 },
    { program_id: program.id, template_id: tplProg, day_of_week: 1, week_offset: 0, order_index: 2 },
  ];
  const { error: schErr } = await supabase.from('program_schedules').insert(schedules);
  if (schErr) throw schErr;

  const startDate = new Date();
  startDate.setHours(12, 0, 0, 0);
  const endDate = addDays(startDate, 4 * 7 - 1);

  const { data: assignment, error: asgErr } = await supabase
    .from('program_assignments')
    .insert({
      program_id: program.id,
      pt_user_id: ptUserId,
      atleta_user_id: atletaUserId,
      start_date: isoDate(startDate),
      end_date: isoDate(endDate),
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
    { id: tplLibera, kind: 'libera', title: 'A — Full Body Libera' },
    { id: tplProp, kind: 'propedeutica', title: 'B — Full Body Propedeutica' },
    { id: tplProg, kind: 'progressiva', title: 'C — Full Body Progressiva' },
  ];

  const payloads = {};
  for (const t of rotation) {
    payloads[t.id] = await loadTemplatePayload(t.id);
  }

  const dates = computeScheduleDates(startDate, activeDays, 4);
  let created = 0;
  for (let i = 0; i < dates.length; i++) {
    const tpl = rotation[i % rotation.length];
    await createWorkoutFromTemplate({
      atletaUserId,
      ptUserId,
      templateId: tpl.id,
      title: tpl.title,
      templateKind: tpl.kind,
      scheduledDate: isoDate(dates[i]),
      exercises: payloads[tpl.id],
    });
    created += 1;
  }

  await supabase
    .from('program_assignments')
    .update({ current_index: dates.length % rotation.length, weeks_generated: 4 })
    .eq('id', assignment.id);

  await supabase.from('notifications').insert({
    user_id: atletaUserId,
    type: 'program_assigned',
    title: 'Nuovo programma di allenamento!',
    body: `Il tuo Coach ti ha assegnato il programma "${PROGRAM_NAME}"`,
    action_url: '/app/scheda',
    data: { pt_user_id: ptUserId, program_id: program.id },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        athlete: ATHLETE_EMAIL,
        program_id: program.id,
        assignment_id: assignment.id,
        workouts_created: created,
        templates: rotation.map((t) => ({ title: t.title, kind: t.kind, id: t.id })),
        start_date: isoDate(startDate),
        end_date: isoDate(endDate),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error('SEED FAILED:', err.message || err);
  process.exit(1);
});
