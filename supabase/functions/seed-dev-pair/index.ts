import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const users = [
      {
        email: 'marco.ferrari.pt@gmail.com',
        password: 'TestPT2026!',
        firstName: 'Marco',
        lastName: 'Ferrari',
        role: 'pt' as const,
      },
      {
        email: 'giulia.rossi.atleta@gmail.com',
        password: 'TestAtleta2026!',
        firstName: 'Giulia',
        lastName: 'Rossi',
        role: 'atleta' as const,
      },
    ]

    const ids: Record<string, string> = {}

    for (const u of users) {
      // Check if exists
      const { data: existing } = await admin
        .from('profiles')
        .select('user_id')
        .eq('email', u.email)
        .maybeSingle()

      let userId: string
      if (existing?.user_id) {
        userId = existing.user_id
        console.log(`User ${u.email} already exists: ${userId}`)
      } else {
        const { data, error } = await admin.auth.admin.createUser({
          email: u.email,
          password: u.password,
          email_confirm: true,
          user_metadata: { role: u.role },
        })
        if (error || !data.user) throw new Error(`Auth create ${u.email}: ${error?.message}`)
        userId = data.user.id

        await admin.from('profiles').upsert(
          { user_id: userId, email: u.email, first_name: u.firstName, last_name: u.lastName },
          { onConflict: 'user_id' }
        )
        await admin.from('user_roles').upsert(
          { user_id: userId, role: u.role },
          { onConflict: 'user_id,role' }
        )
      }

      // Ensure profile names
      await admin
        .from('profiles')
        .update({ first_name: u.firstName, last_name: u.lastName, email: u.email })
        .eq('user_id', userId)

      ids[u.role] = userId
    }

    const ptId = ids.pt
    const atletaId = ids.atleta

    // PT profile
    await admin.from('pt_profiles').upsert(
      { user_id: ptId, status: 'attivo' },
      { onConflict: 'user_id' }
    )

    // Atleta profile
    await admin.from('atleta_profiles').upsert(
      { user_id: atletaId, status: 'collegato', referred_by_pt: ptId },
      { onConflict: 'user_id' }
    )

    // Connection
    const { data: existingConn } = await admin
      .from('pt_atleta_connections')
      .select('id, status')
      .eq('pt_user_id', ptId)
      .eq('atleta_user_id', atletaId)
      .maybeSingle()

    if (existingConn) {
      await admin
        .from('pt_atleta_connections')
        .update({ status: 'active', requested_by: ptId, accepted_at: new Date().toISOString() })
        .eq('id', existingConn.id)
    } else {
      await admin.from('pt_atleta_connections').insert({
        pt_user_id: ptId,
        atleta_user_id: atletaId,
        status: 'active',
        requested_by: ptId,
        accepted_at: new Date().toISOString(),
      })
    }

    return new Response(
      JSON.stringify({ success: true, pt: { id: ptId, email: users[0].email }, atleta: { id: atletaId, email: users[1].email } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
