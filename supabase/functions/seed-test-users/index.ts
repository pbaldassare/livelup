import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generatePassword(): string {
  return crypto.randomUUID().slice(0, 8) + 'Aa1!'
}

interface TestUser {
  email: string
  firstName: string
  lastName: string
  role: 'pt' | 'atleta'
  profileData: Record<string, unknown>
}

const testUsers: TestUser[] = [
  // Personal Trainers
  {
    email: 'pt1@fitplatform.com',
    firstName: 'Marco',
    lastName: 'Rossi',
    role: 'pt',
    profileData: {
      bio: 'Personal trainer certificato con 8 anni di esperienza. Specializzato in bodybuilding e preparazione atletica.',
      specializations: ['Bodybuilding', 'Preparazione Atletica', 'Powerlifting'],
      certifications: ['ISSA CPT', 'NSCA-CSCS'],
      experience_years: 8,
      hourly_rate: 50,
      price_min: 40,
      price_max: 70,
      offers_online: true,
      offers_in_person: true,
      is_discoverable: true,
      status: 'attivo',
      level: 'senior',
      max_athletes: 30,
      location_city: 'Milano',
      location_country: 'Italia',
      method_description: 'Approccio scientifico basato su periodizzazione e progressione lineare.'
    }
  },
  {
    email: 'pt2@fitplatform.com',
    firstName: 'Laura',
    lastName: 'Bianchi',
    role: 'pt',
    profileData: {
      bio: 'Esperta in functional training e recupero post-infortunio. Certificata Calisthenics L2.',
      specializations: ['Functional Training', 'Riabilitazione', 'Calisthenics'],
      certifications: ['Calisthenics L2', 'FMS Certified'],
      experience_years: 5,
      hourly_rate: 45,
      price_min: 35,
      price_max: 60,
      offers_online: true,
      offers_in_person: true,
      is_discoverable: true,
      status: 'attivo',
      level: 'mid',
      max_athletes: 25,
      location_city: 'Roma',
      location_country: 'Italia',
      method_description: 'Focus su movimento funzionale e prevenzione infortuni.'
    }
  },
  {
    email: 'pt3@fitplatform.com',
    firstName: 'Giuseppe',
    lastName: 'Verdi',
    role: 'pt',
    profileData: {
      bio: 'Specialista in dimagrimento e tonificazione. Approccio olistico che combina allenamento e nutrizione.',
      specializations: ['Dimagrimento', 'Tonificazione', 'Nutrizione Sportiva'],
      certifications: ['ACE CPT', 'Precision Nutrition L1'],
      experience_years: 6,
      hourly_rate: 40,
      price_min: 30,
      price_max: 55,
      offers_online: true,
      offers_in_person: false,
      online_only: true,
      is_discoverable: true,
      status: 'attivo',
      level: 'mid',
      max_athletes: 40,
      location_city: 'Napoli',
      location_country: 'Italia',
      method_description: 'Programmi personalizzati per trasformazione corporea sostenibile.'
    }
  },
  // Atleti
  {
    email: 'atleta1@fitplatform.com',
    firstName: 'Luca',
    lastName: 'Ferrari',
    role: 'atleta',
    profileData: {
      fitness_level: 'intermedio',
      level: 'intermedio',
      goals: ['Aumento massa muscolare', 'Forza'],
      height_cm: 180,
      weight_kg: 75,
      date_of_birth: '1995-03-15',
      status: 'non_collegato'
    }
  },
  {
    email: 'atleta2@fitplatform.com',
    firstName: 'Sofia',
    lastName: 'Romano',
    role: 'atleta',
    profileData: {
      fitness_level: 'principiante',
      level: 'principiante',
      goals: ['Perdita peso', 'Tonificazione'],
      height_cm: 165,
      weight_kg: 62,
      date_of_birth: '1998-07-22',
      status: 'non_collegato'
    }
  },
  {
    email: 'atleta3@fitplatform.com',
    firstName: 'Andrea',
    lastName: 'Colombo',
    role: 'atleta',
    profileData: {
      fitness_level: 'avanzato',
      level: 'avanzato',
      goals: ['Preparazione gara', 'Performance'],
      height_cm: 175,
      weight_kg: 82,
      date_of_birth: '1992-11-08',
      health_notes: 'Nessun problema di salute',
      status: 'non_collegato'
    }
  }
]

Deno.serve(async (req) => {
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verify the caller is an admin
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsError } = await supabaseAuth.auth.getClaims(token)
    if (claimsError || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const callerId = claims.claims.sub as string
    const { data: adminCheck } = await supabaseAdmin
      .from('user_roles').select('role').eq('user_id', callerId).eq('role', 'admin').maybeSingle()
    if (!adminCheck) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const createdUsers: { email: string; role: string; userId: string }[] = []
    const errors: { email: string; error: string }[] = []

    for (const user of testUsers) {
      console.log(`Creating user: ${user.email}`)
      
      try {
        const password = generatePassword()
        // 1. Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password,
          email_confirm: true
        })

        if (authError) {
          // Check if user already exists
          if (authError.message.includes('already been registered')) {
            console.log(`User ${user.email} already exists, skipping...`)
            errors.push({ email: user.email, error: 'Already exists' })
            continue
          }
          throw authError
        }

        const userId = authData.user.id
        console.log(`Auth user created: ${userId}`)

        // 2. Create profile
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            user_id: userId,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName
          })

        if (profileError) {
          console.error(`Profile error for ${user.email}:`, profileError)
        }

        // 3. Create user role
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: userId,
            role: user.role
          })

        if (roleError) {
          console.error(`Role error for ${user.email}:`, roleError)
        }

        // 4. Create role-specific profile
        if (user.role === 'pt') {
          const { error: ptError } = await supabaseAdmin
            .from('pt_profiles')
            .insert({
              user_id: userId,
              ...user.profileData
            })

          if (ptError) {
            console.error(`PT profile error for ${user.email}:`, ptError)
          }
        } else if (user.role === 'atleta') {
          const { error: atletaError } = await supabaseAdmin
            .from('atleta_profiles')
            .insert({
              user_id: userId,
              ...user.profileData
            })

          if (atletaError) {
            console.error(`Atleta profile error for ${user.email}:`, atletaError)
          }
        }

        createdUsers.push({ email: user.email, role: user.role, userId })
        console.log(`Successfully created: ${user.email}`)

      } catch (userError) {
        console.error(`Error creating ${user.email}:`, userError)
        errors.push({ email: user.email, error: String(userError) })
      }
    }

    // Create a test connection between atleta1 and pt1
    if (createdUsers.length > 0) {
      const pt1 = createdUsers.find(u => u.email === 'pt1@fitplatform.com')
      const atleta1 = createdUsers.find(u => u.email === 'atleta1@fitplatform.com')
      
      if (pt1 && atleta1) {
        console.log('Creating test connection between PT1 and Atleta1...')
        
        const { error: connectionError } = await supabaseAdmin
          .from('pt_atleta_connections')
          .insert({
            pt_user_id: pt1.userId,
            atleta_user_id: atleta1.userId,
            status: 'active',
            requested_by: atleta1.userId,
            accepted_at: new Date().toISOString()
          })

        if (connectionError) {
          console.error('Connection error:', connectionError)
        } else {
          // Update atleta1 status to 'collegato'
          await supabaseAdmin
            .from('atleta_profiles')
            .update({ status: 'collegato' })
            .eq('user_id', atleta1.userId)
          
          console.log('Test connection created successfully')
        }
      }

      // Create pending connection request from atleta2 to pt2
      const pt2 = createdUsers.find(u => u.email === 'pt2@fitplatform.com')
      const atleta2 = createdUsers.find(u => u.email === 'atleta2@fitplatform.com')
      
      if (pt2 && atleta2) {
        console.log('Creating pending connection request from Atleta2 to PT2...')
        
        const { error: pendingError } = await supabaseAdmin
          .from('pt_atleta_connections')
          .insert({
            pt_user_id: pt2.userId,
            atleta_user_id: atleta2.userId,
            status: 'pending',
            requested_by: atleta2.userId
          })

        if (pendingError) {
          console.error('Pending connection error:', pendingError)
        } else {
          console.log('Pending connection request created successfully')
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${createdUsers.length} users`,
        createdUsers,
        errors
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Seed error:', error)
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
