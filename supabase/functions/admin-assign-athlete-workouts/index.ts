import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AssignRequest {
  ptUserId: string;
  athleteUserId: string;
  templateIds?: string[];
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

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const callerId = claims.claims.sub as string;
    const { data: adminCheck } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminCheck) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: AssignRequest = await req.json();
    const { ptUserId, athleteUserId, templateIds = [] } = body;
    if (!ptUserId || !athleteUserId) {
      return new Response(JSON.stringify({ error: 'ptUserId and athleteUserId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let templatesQuery = admin
      .from('workout_templates')
      .select('id, title, description')
      .eq('pt_user_id', ptUserId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (templateIds.length > 0) {
      templatesQuery = admin
        .from('workout_templates')
        .select('id, title, description')
        .in('id', templateIds);
    }

    const { data: templates, error: tplErr } = await templatesQuery;
    if (tplErr || !templates?.length) {
      return new Response(JSON.stringify({ error: 'No templates found', details: tplErr?.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const day = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const plan = [
      { template: templates[0], status: 'completato', scheduled: now - 7 * day, completed: now - 6 * day },
      { template: templates[1] ?? templates[0], status: 'completato', scheduled: now - 3 * day, completed: now - 2 * day },
      { template: templates[2] ?? templates[0], status: 'attivo', scheduled: now + 1 * day, due: now + 3 * day },
    ];

    const created: string[] = [];

    for (const item of plan) {
      const scheduledIso = new Date(item.scheduled).toISOString();
      const { data: existing } = await admin
        .from('workouts')
        .select('id')
        .eq('atleta_user_id', athleteUserId)
        .eq('pt_user_id', ptUserId)
        .eq('template_id', item.template.id)
        .eq('status', item.status)
        .maybeSingle();

      if (existing) continue;

      const { data: workout, error: wErr } = await admin
        .from('workouts')
        .insert({
          atleta_user_id: athleteUserId,
          pt_user_id: ptUserId,
          title: item.template.title,
          description: item.template.description,
          template_id: item.template.id,
          status: item.status,
          scheduled_date: scheduledIso,
          due_date: item.due ? new Date(item.due).toISOString() : null,
          completed_at: item.completed ? new Date(item.completed).toISOString() : null,
        })
        .select('id')
        .single();

      if (wErr || !workout) {
        return new Response(JSON.stringify({ error: wErr?.message ?? 'workout insert failed', created }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const [{ data: blocks }, { data: exercises }] = await Promise.all([
        admin
          .from('template_blocks')
          .select('id, order_index, type, name, params, info_note')
          .eq('template_id', item.template.id)
          .order('order_index'),
        admin
          .from('template_exercises')
          .select(
            'exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes, block_id, prescribed_duration_seconds, sets_data, protocol_type, protocol_params',
          )
          .eq('template_id', item.template.id)
          .order('order_index'),
      ]);

      const blockIdMap = new Map<string, string>();
      if (blocks?.length) {
        const { data: insertedBlocks, error: bErr } = await admin
          .from('workout_blocks')
          .insert(
            blocks.map((b) => ({
              workout_id: workout.id,
              order_index: b.order_index,
              type: b.type,
              name: b.name,
              params: b.params ?? {},
              info_note: b.info_note,
            })),
          )
          .select('id, order_index');
        if (bErr) {
          return new Response(JSON.stringify({ error: bErr.message, created }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        for (const b of insertedBlocks ?? []) {
          const src = blocks.find((x) => x.order_index === b.order_index);
          if (src) blockIdMap.set(src.id, b.id);
        }
      }

      if (exercises?.length) {
        const { error: exErr } = await admin.from('workout_exercises').insert(
          exercises.map((e) => ({
            workout_id: workout.id,
            exercise_id: e.exercise_id,
            order_index: e.order_index,
            prescribed_sets: e.sets,
            prescribed_reps_min: e.reps_min,
            prescribed_reps_max: e.reps_max,
            prescribed_duration_seconds: e.prescribed_duration_seconds,
            rest_seconds: e.rest_seconds ?? 60,
            notes: e.notes,
            sets_data: e.sets_data,
            block_id: e.block_id ? blockIdMap.get(e.block_id) ?? null : null,
            protocol_type: e.protocol_type ?? 'SET',
            protocol_params: e.protocol_params ?? {},
          })),
        );
        if (exErr) {
          return new Response(JSON.stringify({ error: exErr.message, created }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      created.push(workout.id);
    }

    return new Response(JSON.stringify({ success: true, createdCount: created.length, workoutIds: created }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
