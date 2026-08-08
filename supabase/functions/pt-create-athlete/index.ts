import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  DEFAULT_ATHLETE_PASSWORD,
  sendAthleteWelcomeEmail,
} from '../_shared/athleteWelcomeEmail.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateAthleteRequest {
  email: string
  firstName: string
  lastName: string
  phone?: string
  fitnessLevel?: string
  goals?: string[]
}

const VALID_FITNESS_LEVELS = new Set([
  'principiante',
  'intermedio',
  'avanzato',
  'agonista',
])

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Non autorizzato' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token)
    if (claimsError || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Token non valido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const ptUserId = claims.claims.sub as string

    const { data: ptRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', ptUserId)
      .eq('role', 'pt')
      .maybeSingle()

    if (!ptRole) {
      return new Response(JSON.stringify({ error: 'Solo i Personal Trainer possono creare atleti' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body: CreateAthleteRequest = await req.json()
    const { email, firstName, lastName, phone, fitnessLevel, goals = [] } = body

    if (!email?.trim() || !firstName?.trim() || !lastName?.trim()) {
      return new Response(JSON.stringify({ error: 'Nome, cognome ed email sono obbligatori' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (fitnessLevel && !VALID_FITNESS_LEVELS.has(fitnessLevel)) {
      return new Response(JSON.stringify({ error: 'Seleziona un livello di allenamento valido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resolvedFitnessLevel = fitnessLevel || null
    const resolvedGoals = goals || []

    const normalizedEmail = email.trim().toLowerCase()

    const { data: canAccept, error: acceptErr } = await supabaseAdmin.rpc('can_pt_accept_athletes', {
      _pt_user_id: ptUserId,
    })
    if (acceptErr || !canAccept) {
      return new Response(JSON.stringify({ error: 'Hai raggiunto il numero massimo di atleti' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .ilike('email', normalizedEmail)
      .maybeSingle()

    if (existingProfile) {
      return new Response(JSON.stringify({ error: 'Esiste già un account con questa email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: DEFAULT_ATHLETE_PASSWORD,
      email_confirm: true,
      user_metadata: { role: 'atleta' },
    })

    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: authError?.message || 'Creazione account fallita' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const newUserId = authData.user.id

    const cleanup = async () => {
      await supabaseAdmin.from('pt_atleta_connections').delete().eq('atleta_user_id', newUserId)
      await supabaseAdmin.from('atleta_profiles').delete().eq('user_id', newUserId)
      await supabaseAdmin.from('user_roles').delete().eq('user_id', newUserId)
      await supabaseAdmin.from('profiles').delete().eq('user_id', newUserId)
      await supabaseAdmin.auth.admin.deleteUser(newUserId)
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        email: normalizedEmail,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone?.trim() || null,
      })
      .eq('user_id', newUserId)

    if (profileError) {
      const { data: profileRow } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .eq('user_id', newUserId)
        .maybeSingle()

      if (!profileRow) {
        const { error: profileInsertError } = await supabaseAdmin.from('profiles').insert({
          user_id: newUserId,
          email: normalizedEmail,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone?.trim() || null,
        })

        if (profileInsertError) {
          await cleanup()
          return new Response(JSON.stringify({ error: 'Errore profilo: ' + profileInsertError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      } else {
        await cleanup()
        return new Response(JSON.stringify({ error: 'Errore profilo: ' + profileError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', newUserId)
      .eq('role', 'atleta')
      .maybeSingle()

    if (!existingRole) {
      const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
        user_id: newUserId,
        role: 'atleta',
      })

      if (roleError) {
        await cleanup()
        return new Response(JSON.stringify({ error: 'Errore ruolo: ' + roleError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const { error: atletaError } = await supabaseAdmin
      .from('atleta_profiles')
      .update({
        status: 'collegato',
        fitness_level: resolvedFitnessLevel,
        level: resolvedFitnessLevel,
        goals: resolvedGoals,
        referred_by_pt: ptUserId,
      })
      .eq('user_id', newUserId)

    if (atletaError) {
      const { data: atletaRow } = await supabaseAdmin
        .from('atleta_profiles')
        .select('user_id')
        .eq('user_id', newUserId)
        .maybeSingle()

      if (!atletaRow) {
        const { error: atletaInsertError } = await supabaseAdmin.from('atleta_profiles').insert({
          user_id: newUserId,
          status: 'collegato',
          fitness_level: resolvedFitnessLevel,
          level: resolvedFitnessLevel,
          goals: resolvedGoals,
          referred_by_pt: ptUserId,
        })

        if (atletaInsertError) {
          await cleanup()
          return new Response(JSON.stringify({ error: 'Errore profilo atleta: ' + atletaInsertError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      } else {
        await cleanup()
        return new Response(JSON.stringify({ error: 'Errore profilo atleta: ' + atletaError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const now = new Date().toISOString()
    const { data: connection, error: connError } = await supabaseAdmin
      .from('pt_atleta_connections')
      .insert({
        pt_user_id: ptUserId,
        atleta_user_id: newUserId,
        status: 'active',
        requested_by: ptUserId,
        requested_at: now,
        accepted_at: now,
        is_pt_active: true,
      })
      .select('id')
      .single()

    if (connError) {
      await cleanup()
      return new Response(JSON.stringify({ error: 'Errore collegamento: ' + connError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await supabaseAdmin
      .from('pt_athlete_owners')
      .upsert(
        { atleta_user_id: newUserId, owner_pt_user_id: ptUserId, updated_at: now },
        { onConflict: 'atleta_user_id' },
      )


    const { data: ptProfile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', ptUserId)
      .maybeSingle()

    const ptName =
      [ptProfile?.first_name, ptProfile?.last_name].filter(Boolean).join(' ').trim() ||
      'Il tuo Personal Trainer'

    await supabaseAdmin.from('notifications').insert({
      user_id: newUserId,
      type: 'welcome',
      title: 'Benvenuto su Livelapp',
      body: `${ptName} ti ha aggiunto come atleta. Controlla la tua email per le credenziali di accesso e cambia subito la password.`,
      action_url: '/app',
      data: { pt_user_id: ptUserId, connection_id: connection.id },
    })

    const emailResult = await sendAthleteWelcomeEmail({
      to: normalizedEmail,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      ptName,
      temporaryPassword: DEFAULT_ATHLETE_PASSWORD,
    })

    return new Response(
      JSON.stringify({
        success: true,
        emailSent: emailResult.sent,
        emailStatus: emailResult.sent ? 'sent' : emailResult.reason || 'pending',
        user: {
          id: newUserId,
          email: normalizedEmail,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          connectionId: connection.id,
        },
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Errore interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
