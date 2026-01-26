import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateUserRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  role: 'pt' | 'atleta'
  profileData?: {
    // PT specific
    level?: string
    location_city?: string
    specializations?: string[]
    status?: string
    bio?: string
    // Atleta specific
    fitness_level?: string
    goals?: string[]
    date_of_birth?: string
    height_cm?: number
    weight_kg?: number
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify admin auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify the caller is an admin
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token)
    
    if (claimsError || !claims?.claims) {
      console.error('Claims error:', claimsError)
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = claims.claims.sub as string

    // Check if user is admin
    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle()

    if (adminError || !adminCheck) {
      console.error('Admin check failed:', adminError)
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body: CreateUserRequest = await req.json()
    const { email, password, firstName, lastName, role, profileData = {} } = body

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, firstName, lastName, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!['pt', 'atleta'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be "pt" or "atleta"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Creating ${role} user: ${email}`)

    // 1. Create auth user with admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: { role }
    })

    if (authError || !authData.user) {
      console.error('Auth creation error:', authError)
      return new Response(
        JSON.stringify({ error: authError?.message || 'Failed to create user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const newUserId = authData.user.id
    console.log(`Created auth user: ${newUserId}`)

    // 2. Create base profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: newUserId,
        email,
        first_name: firstName,
        last_name: lastName
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Try to clean up auth user
      await supabaseAdmin.auth.admin.deleteUser(newUserId)
      return new Response(
        JSON.stringify({ error: 'Failed to create profile: ' + profileError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Create user role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUserId,
        role: role
      })

    if (roleError) {
      console.error('Role creation error:', roleError)
      // Clean up
      await supabaseAdmin.from('profiles').delete().eq('user_id', newUserId)
      await supabaseAdmin.auth.admin.deleteUser(newUserId)
      return new Response(
        JSON.stringify({ error: 'Failed to create role: ' + roleError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Create role-specific profile
    if (role === 'pt') {
      const { error: ptError } = await supabaseAdmin
        .from('pt_profiles')
        .insert({
          user_id: newUserId,
          status: profileData.status || 'registrato',
          level: profileData.level || 'junior',
          location_city: profileData.location_city || null,
          specializations: profileData.specializations || [],
          bio: profileData.bio || null
        })

      if (ptError) {
        console.error('PT profile creation error:', ptError)
        // Clean up
        await supabaseAdmin.from('user_roles').delete().eq('user_id', newUserId)
        await supabaseAdmin.from('profiles').delete().eq('user_id', newUserId)
        await supabaseAdmin.auth.admin.deleteUser(newUserId)
        return new Response(
          JSON.stringify({ error: 'Failed to create PT profile: ' + ptError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      const { error: atletaError } = await supabaseAdmin
        .from('atleta_profiles')
        .insert({
          user_id: newUserId,
          status: 'non_collegato',
          fitness_level: profileData.fitness_level || null,
          goals: profileData.goals || [],
          date_of_birth: profileData.date_of_birth || null,
          height_cm: profileData.height_cm || null,
          weight_kg: profileData.weight_kg || null
        })

      if (atletaError) {
        console.error('Atleta profile creation error:', atletaError)
        // Clean up
        await supabaseAdmin.from('user_roles').delete().eq('user_id', newUserId)
        await supabaseAdmin.from('profiles').delete().eq('user_id', newUserId)
        await supabaseAdmin.auth.admin.deleteUser(newUserId)
        return new Response(
          JSON.stringify({ error: 'Failed to create atleta profile: ' + atletaError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    console.log(`Successfully created ${role}: ${email}`)

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUserId,
          email,
          role,
          firstName,
          lastName
        }
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
