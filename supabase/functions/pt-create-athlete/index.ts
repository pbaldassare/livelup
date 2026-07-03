import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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

function randomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  let out = ''
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  for (const b of bytes) out += chars[b % chars.length]
  return out
}

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
      password: randomPassword(),
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

    const level = fitnessLevel && fitnessLevel !== 'nessuno' ? fitnessLevel : null

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
      await cleanup()
      return new Response(JSON.stringify({ error: 'Errore profilo: ' + profileError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error: atletaError } = await supabaseAdmin
      .from('atleta_profiles')
      .update({
        fitness_level: level,
        level,
        goals: goals.length ? goals : [],
        referred_by_pt: ptUserId,
      })
      .eq('user_id', newUserId)

    if (atletaError) {
      await cleanup()
      return new Response(JSON.stringify({ error: 'Errore profilo atleta: ' + atletaError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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

    const { data: ptProfile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', ptUserId)
      .maybeSingle()

    const ptName = [ptProfile?.first_name, ptProfile?.last_name].filter(Boolean).join(' ').trim() || 'Il tuo Personal Trainer'

    await supabaseAdmin.from('notifications').insert({
      user_id: newUserId,
      type: 'welcome',
      title: 'Benvenuto su LIVEL APP',
      body: `${ptName} ti ha aggiunto come atleta. Controlla la tua email per impostare la password e accedere.`,
      action_url: '/app',
      data: { pt_user_id: ptUserId, connection_id: connection.id },
    })

    const siteUrl = Deno.env.get('SITE_URL') || Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || ''
    await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
      options: siteUrl ? { redirectTo: `${siteUrl}/auth?mode=recovery` } : undefined,
    })

    return new Response(
      JSON.stringify({
        success: true,
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
