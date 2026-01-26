import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results: Record<string, unknown> = {};

    // 1. Get existing user IDs from profiles and user_roles
    console.log('Fetching existing users...');
    
    const { data: ptUsers } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'pt');
    
    const { data: atletaUsers } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'atleta');

    if (!ptUsers || ptUsers.length < 3) {
      return new Response(JSON.stringify({ 
        error: 'Not enough PT users. Run seed-test-users first.' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (!atletaUsers || atletaUsers.length < 3) {
      return new Response(JSON.stringify({ 
        error: 'Not enough atleta users. Run seed-test-users first.' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const pt1Id = ptUsers[0].user_id;
    const pt2Id = ptUsers[1].user_id;
    const pt3Id = ptUsers[2].user_id;
    const atleta1Id = atletaUsers[0].user_id;
    const atleta2Id = atletaUsers[1].user_id;
    const atleta3Id = atletaUsers[2].user_id;

    console.log('Users found:', { pt1Id, pt2Id, pt3Id, atleta1Id, atleta2Id, atleta3Id });

    // 2. Update base exercises with missing video/image URLs
    console.log('Updating base exercises with media...');
    const exerciseMediaUpdates = [
      { name: 'Trazioni', video_url: 'https://www.youtube.com/watch?v=eGo4IYlbE5g', image_url: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=800' },
      { name: 'Push-up', video_url: 'https://www.youtube.com/watch?v=IODxDxX7oi4', image_url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800' },
      { name: 'Plank', video_url: 'https://www.youtube.com/watch?v=ASdvN_XEl_c', image_url: 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=800' },
      { name: 'Corsa', video_url: 'https://www.youtube.com/watch?v=_kGESn8ArrU', image_url: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800' },
      { name: 'Burpees', video_url: 'https://www.youtube.com/watch?v=TU8QYVW0gDU', image_url: 'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=800' },
    ];

    for (const update of exerciseMediaUpdates) {
      await supabase
        .from('exercises')
        .update({ video_url: update.video_url, image_url: update.image_url })
        .eq('name', update.name)
        .is('video_url', null);
    }
    results.exercises_media_updated = exerciseMediaUpdates.length;

    // 3. Fix template ownership - assign templates to real PTs
    console.log('Fixing template ownership...');
    const { data: templates } = await supabase
      .from('workout_templates')
      .select('id, title')
      .order('created_at', { ascending: true });

    if (templates && templates.length > 0) {
      const templateUpdates = templates.map((t, i) => {
        let ptId = pt1Id;
        if (i >= 7) ptId = pt3Id;
        else if (i >= 4) ptId = pt2Id;
        return { id: t.id, pt_user_id: ptId };
      });

      for (const update of templateUpdates) {
        await supabase
          .from('workout_templates')
          .update({ pt_user_id: update.pt_user_id })
          .eq('id', update.id);
      }
      results.templates_updated = templateUpdates.length;
    }

    // 3. Create PT Packages (9 total - 3 per PT)
    console.log('Creating PT packages...');
    const { data: existingPackages } = await supabase
      .from('pt_packages')
      .select('id')
      .limit(1);

    if (!existingPackages || existingPackages.length === 0) {
      const packages = [
        // PT1 packages
        { pt_user_id: pt1Id, name: 'Starter Pack', package_type: 'sessioni', sessions_count: 5, price: 80, description: '5 sessioni per iniziare il tuo percorso fitness', includes_chat: true, includes_video_calls: false, is_active: true, is_featured: false, sort_order: 1 },
        { pt_user_id: pt1Id, name: 'Percorso Trasformazione', package_type: 'sessioni', sessions_count: 10, price: 150, description: '10 sessioni personalizzate per raggiungere i tuoi obiettivi', includes_chat: true, includes_video_calls: true, is_active: true, is_featured: true, sort_order: 2 },
        { pt_user_id: pt1Id, name: 'Abbonamento Premium', package_type: 'mensile', duration_days: 30, price: 200, description: 'Accesso illimitato per un mese con supporto completo', includes_chat: true, includes_video_calls: true, max_workouts_per_week: 5, is_active: true, is_featured: false, sort_order: 3 },
        // PT2 packages
        { pt_user_id: pt2Id, name: 'Prova Base', package_type: 'sessioni', sessions_count: 5, price: 75, description: 'Pacchetto introduttivo per conoscerci', includes_chat: true, includes_video_calls: false, is_active: true, is_featured: false, sort_order: 1 },
        { pt_user_id: pt2Id, name: 'Programma Intensivo', package_type: 'sessioni', sessions_count: 10, price: 140, description: 'Programma completo per risultati visibili', includes_chat: true, includes_video_calls: true, is_active: true, is_featured: true, sort_order: 2 },
        { pt_user_id: pt2Id, name: 'Full Access Mensile', package_type: 'mensile', duration_days: 30, price: 180, description: 'Tutto incluso per un mese intero', includes_chat: true, includes_video_calls: true, max_workouts_per_week: 4, is_active: true, is_featured: false, sort_order: 3 },
        // PT3 packages
        { pt_user_id: pt3Id, name: 'Intro Fitness', package_type: 'sessioni', sessions_count: 5, price: 85, description: 'Inizia con 5 sessioni guidate', includes_chat: true, includes_video_calls: false, is_active: true, is_featured: false, sort_order: 1 },
        { pt_user_id: pt3Id, name: 'Percorso Completo', package_type: 'sessioni', sessions_count: 10, price: 160, description: '10 sessioni per una trasformazione completa', includes_chat: true, includes_video_calls: true, is_active: true, is_featured: true, sort_order: 2 },
        { pt_user_id: pt3Id, name: 'Elite Monthly', package_type: 'mensile', duration_days: 30, price: 220, description: 'Il massimo del coaching personalizzato', includes_chat: true, includes_video_calls: true, max_workouts_per_week: 6, is_active: true, is_featured: false, sort_order: 3 },
      ];

      const { data: createdPackages, error: packagesError } = await supabase
        .from('pt_packages')
        .insert(packages)
        .select();

      if (packagesError) {
        console.error('Error creating packages:', packagesError);
      } else {
        results.packages_created = createdPackages?.length || 0;
      }
    }

    // Get package IDs for subscriptions
    const { data: allPackages } = await supabase
      .from('pt_packages')
      .select('id, pt_user_id, package_type, sessions_count')
      .eq('is_active', true);

    const pt1Package = allPackages?.find(p => p.pt_user_id === pt1Id && p.sessions_count === 10);
    const pt2Package = allPackages?.find(p => p.pt_user_id === pt2Id && p.sessions_count === 10);

    // 4. Create subscriptions
    console.log('Creating subscriptions...');
    const { data: existingSubs } = await supabase
      .from('atleta_pt_subscriptions')
      .select('id')
      .limit(1);

    if (!existingSubs || existingSubs.length === 0) {
      const now = new Date();
      const subscriptions = [
        // Atleta1 active subscription with PT1
        {
          atleta_user_id: atleta1Id,
          pt_user_id: pt1Id,
          package_id: pt1Package?.id,
          status: 'attivo',
          price_paid: 150,
          sessions_total: 10,
          sessions_used: 3,
          started_at: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Obiettivo: perdere 5kg in 2 mesi'
        },
        // Atleta2 expired subscription with PT2
        {
          atleta_user_id: atleta2Id,
          pt_user_id: pt2Id,
          package_id: pt2Package?.id,
          status: 'scaduto',
          price_paid: 140,
          sessions_total: 10,
          sessions_used: 10,
          started_at: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          expires_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Completato con successo'
        },
        // Atleta3 new subscription with PT1
        {
          atleta_user_id: atleta3Id,
          pt_user_id: pt1Id,
          package_id: pt1Package?.id,
          status: 'attivo',
          price_paid: 80,
          sessions_total: 5,
          sessions_used: 0,
          started_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Nuovo cliente - valutazione iniziale'
        }
      ];

      const { data: createdSubs, error: subsError } = await supabase
        .from('atleta_pt_subscriptions')
        .insert(subscriptions)
        .select();

      if (subsError) {
        console.error('Error creating subscriptions:', subsError);
      } else {
        results.subscriptions_created = createdSubs?.length || 0;
      }
    }

    // 5. Ensure connections exist
    console.log('Creating/updating connections...');
    const connections = [
      { pt_user_id: pt1Id, atleta_user_id: atleta1Id, status: 'active', requested_by: atleta1Id },
      { pt_user_id: pt2Id, atleta_user_id: atleta2Id, status: 'active', requested_by: atleta2Id },
      { pt_user_id: pt1Id, atleta_user_id: atleta3Id, status: 'active', requested_by: atleta3Id },
    ];

    for (const conn of connections) {
      const { data: existing } = await supabase
        .from('pt_atleta_connections')
        .select('id')
        .eq('pt_user_id', conn.pt_user_id)
        .eq('atleta_user_id', conn.atleta_user_id)
        .maybeSingle();

      if (!existing) {
        await supabase.from('pt_atleta_connections').insert({
          ...conn,
          accepted_at: new Date().toISOString()
        });
      } else {
        await supabase
          .from('pt_atleta_connections')
          .update({ status: 'active', accepted_at: new Date().toISOString() })
          .eq('id', existing.id);
      }
    }
    results.connections_ensured = connections.length;

    // 6. Create workouts with exercises
    console.log('Creating workouts...');
    const { data: existingWorkouts } = await supabase
      .from('workouts')
      .select('id')
      .limit(1);

    if (!existingWorkouts || existingWorkouts.length === 0) {
      const { data: availableTemplates } = await supabase
        .from('workout_templates')
        .select('id, title, pt_user_id')
        .limit(5);

      const now = new Date();
      const workouts = [
        // Atleta1 workouts (4 total)
        { atleta_user_id: atleta1Id, pt_user_id: pt1Id, title: 'Settimana 1 - Full Body', description: 'Allenamento completo per iniziare', status: 'completato', scheduled_date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), completed_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), template_id: availableTemplates?.[0]?.id },
        { atleta_user_id: atleta1Id, pt_user_id: pt1Id, title: 'Settimana 1 - Upper Body', description: 'Focus su petto, spalle e braccia', status: 'completato', scheduled_date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), completed_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), template_id: availableTemplates?.[1]?.id },
        { atleta_user_id: atleta1Id, pt_user_id: pt1Id, title: 'Settimana 2 - Lower Body', description: 'Gambe e glutei', status: 'attivo', scheduled_date: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(), due_date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(), template_id: availableTemplates?.[2]?.id },
        { atleta_user_id: atleta1Id, pt_user_id: pt1Id, title: 'Settimana 2 - HIIT Cardio', description: 'Allenamento ad alta intensità', status: 'attivo', scheduled_date: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(), due_date: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString(), template_id: availableTemplates?.[3]?.id },
        // Atleta2 workouts (2 total - historical)
        { atleta_user_id: atleta2Id, pt_user_id: pt2Id, title: 'Programma Forza - Fase 1', description: 'Costruzione base di forza', status: 'completato', scheduled_date: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(), completed_at: new Date(now.getTime() - 44 * 24 * 60 * 60 * 1000).toISOString() },
        { atleta_user_id: atleta2Id, pt_user_id: pt2Id, title: 'Programma Forza - Fase 2', description: 'Progressione carichi', status: 'completato', scheduled_date: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString(), completed_at: new Date(now.getTime() - 34 * 24 * 60 * 60 * 1000).toISOString() },
        // Atleta3 workouts (2 total - new)
        { atleta_user_id: atleta3Id, pt_user_id: pt1Id, title: 'Valutazione Iniziale', description: 'Test di fitness e mobilità', status: 'attivo', scheduled_date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), due_date: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString() },
        { atleta_user_id: atleta3Id, pt_user_id: pt1Id, title: 'Intro Mobilità', description: 'Esercizi base di mobilità articolare', status: 'attivo', scheduled_date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(), due_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() },
      ];

      const { data: createdWorkouts, error: workoutsError } = await supabase
        .from('workouts')
        .insert(workouts)
        .select();

      if (workoutsError) {
        console.error('Error creating workouts:', workoutsError);
      } else {
        results.workouts_created = createdWorkouts?.length || 0;

        // Add exercises to workouts
        const { data: exercises } = await supabase
          .from('exercises')
          .select('id')
          .limit(10);

        if (exercises && exercises.length > 0 && createdWorkouts) {
          const workoutExercises = [];
          for (const workout of createdWorkouts) {
            const numExercises = Math.floor(Math.random() * 3) + 4; // 4-6 exercises
            for (let i = 0; i < numExercises && i < exercises.length; i++) {
              workoutExercises.push({
                workout_id: workout.id,
                exercise_id: exercises[i].id,
                order_index: i,
                prescribed_sets: Math.floor(Math.random() * 2) + 3, // 3-4 sets
                prescribed_reps_min: 8,
                prescribed_reps_max: 12,
                rest_seconds: 60 + Math.floor(Math.random() * 3) * 30, // 60, 90, or 120
              });
            }
          }

          const { error: weError } = await supabase
            .from('workout_exercises')
            .insert(workoutExercises);

          if (weError) {
            console.error('Error creating workout exercises:', weError);
          } else {
            results.workout_exercises_created = workoutExercises.length;
          }
        }
      }
    }

    // 7. Create chats and messages
    console.log('Creating chats and messages...');
    const chatPairs = [
      { pt_user_id: pt1Id, atleta_user_id: atleta1Id, messageCount: 15 },
      { pt_user_id: pt2Id, atleta_user_id: atleta2Id, messageCount: 5 },
      { pt_user_id: pt1Id, atleta_user_id: atleta3Id, messageCount: 3 },
    ];

    const messageTemplates = {
      pt: [
        'Ciao! Come stai oggi?',
        'Ottimo lavoro con l\'allenamento di ieri! 💪',
        'Ricorda di fare stretching dopo ogni sessione',
        'Come va con la dieta? Stai seguendo le indicazioni?',
        'Ho preparato un nuovo workout per te, dagli un\'occhiata!',
        'Perfetto! Continua così',
        'Ti aspetto domani alle 10 in palestra',
        'Hai recuperato bene dopo l\'ultimo allenamento?',
        'Pronto per la prossima sfida?',
        'Vedo progressi fantastici! 🎉'
      ],
      atleta: [
        'Ciao coach! Tutto bene, grazie!',
        'Grazie mille! Mi sono sentito molto bene',
        'Sì, sto seguendo tutto alla lettera',
        'Ho fatto l\'allenamento, era tosto ma ce l\'ho fatta! 💪',
        'Perfetto, lo guardo subito',
        'Grazie per il supporto!',
        'Ci sarò puntuale!',
        'Un po\' di dolori muscolari ma niente di che',
        'Prontissimo! Non vedo l\'ora',
        'Sto notando i primi risultati! 😊'
      ]
    };

    for (const chatPair of chatPairs) {
      let chatId: string;
      
      const { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .eq('pt_user_id', chatPair.pt_user_id)
        .eq('atleta_user_id', chatPair.atleta_user_id)
        .maybeSingle();

      if (existingChat) {
        chatId = existingChat.id;
      } else {
        const { data: newChat } = await supabase
          .from('chats')
          .insert({ 
            pt_user_id: chatPair.pt_user_id, 
            atleta_user_id: chatPair.atleta_user_id,
            is_active: true
          })
          .select()
          .single();
        
        if (!newChat) continue;
        chatId = newChat.id;
      }

      // Check if messages already exist
      const { data: existingMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('chat_id', chatId)
        .limit(1);

      if (!existingMessages || existingMessages.length === 0) {
        const messages = [];
        const now = new Date();
        
        for (let i = 0; i < chatPair.messageCount; i++) {
          const isPT = i % 2 === 0;
          const templates = isPT ? messageTemplates.pt : messageTemplates.atleta;
          const senderId = isPT ? chatPair.pt_user_id : chatPair.atleta_user_id;
          
          messages.push({
            chat_id: chatId,
            sender_user_id: senderId,
            content: templates[Math.floor(Math.random() * templates.length)],
            created_at: new Date(now.getTime() - (chatPair.messageCount - i) * 3600000).toISOString(),
            is_read: i < chatPair.messageCount - 2 // Last 2 messages unread
          });
        }

        await supabase.from('messages').insert(messages);
      }
    }
    results.chats_processed = chatPairs.length;

    // 8. Create reviews
    console.log('Creating reviews...');
    const { data: existingReviews } = await supabase
      .from('pt_reviews')
      .select('id')
      .limit(1);

    if (!existingReviews || existingReviews.length === 0) {
      const reviews = [
        // Reviews for PT1
        { pt_user_id: pt1Id, atleta_user_id: atleta1Id, rating: 5, comment: 'Marco è un trainer eccezionale! Mi ha aiutato a raggiungere i miei obiettivi in modo professionale e motivante. Consiglio a tutti!', is_verified: true, is_visible: true },
        { pt_user_id: pt1Id, atleta_user_id: atleta2Id, rating: 5, comment: 'Preparazione impeccabile e grande disponibilità. Ha capito subito le mie esigenze.', is_verified: true, is_visible: true },
        { pt_user_id: pt1Id, atleta_user_id: atleta3Id, rating: 4, comment: 'Molto professionale, programmi personalizzati e follow-up costante. Ottima esperienza!', is_verified: true, is_visible: true },
        // Reviews for PT2
        { pt_user_id: pt2Id, atleta_user_id: atleta1Id, rating: 5, comment: 'Laura è fantastica! I suoi allenamenti sono vari e mai noiosi. Ho perso 8kg in 3 mesi!', is_verified: true, is_visible: true },
        { pt_user_id: pt2Id, atleta_user_id: atleta3Id, rating: 4, comment: 'Ottima trainer, molto attenta alla tecnica e alla prevenzione infortuni.', is_verified: true, is_visible: true },
        // Review for PT3
        { pt_user_id: pt3Id, atleta_user_id: atleta1Id, rating: 5, comment: 'Giuseppe è il migliore! Competente, paziente e sempre disponibile. Risultati garantiti!', is_verified: true, is_visible: true },
      ];

      const { data: createdReviews, error: reviewsError } = await supabase
        .from('pt_reviews')
        .insert(reviews)
        .select();

      if (reviewsError) {
        console.error('Error creating reviews:', reviewsError);
      } else {
        results.reviews_created = createdReviews?.length || 0;
      }
    }

    // 9. Create calendar events (including 4 public events with GPS coordinates)
    console.log('Creating calendar events...');
    const { data: existingEvents } = await supabase
      .from('calendar_events')
      .select('id')
      .eq('is_public', false)
      .limit(1);

    if (!existingEvents || existingEvents.length === 0) {
      const now = new Date();
      const events = [
        // PT1 private events
        { creator_user_id: pt1Id, pt_user_id: pt1Id, atleta_user_id: atleta1Id, title: 'Allenamento - Full Body', event_type: 'allenamento', start_datetime: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000).toISOString(), end_datetime: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000).toISOString(), location: 'Palestra FitLife', is_public: false },
        { creator_user_id: pt1Id, pt_user_id: pt1Id, atleta_user_id: atleta1Id, title: 'Check-in Settimanale', event_type: 'altro', start_datetime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000).toISOString(), end_datetime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 9.5 * 60 * 60 * 1000).toISOString(), description: 'Verifica progressi e obiettivi', is_public: false },
        { creator_user_id: pt1Id, pt_user_id: pt1Id, atleta_user_id: atleta3Id, title: 'Valutazione Iniziale', event_type: 'allenamento', start_datetime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000).toISOString(), end_datetime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000).toISOString(), location: 'Palestra FitLife', description: 'Prima sessione di valutazione', is_public: false },
        // PT2 private events
        { creator_user_id: pt2Id, pt_user_id: pt2Id, atleta_user_id: atleta2Id, title: 'Allenamento Cardio', event_type: 'allenamento', start_datetime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 18 * 60 * 60 * 1000).toISOString(), end_datetime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 19 * 60 * 60 * 1000).toISOString(), is_public: false },
        
        // ===== 4 PUBLIC EVENTS WITH GPS COORDINATES =====
        // 1. CrossFit Day Brescia - Raduno (+7 giorni)
        { 
          creator_user_id: pt1Id, 
          pt_user_id: pt1Id, 
          title: 'CrossFit Day Brescia', 
          event_type: 'raduno', 
          start_datetime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000).toISOString(), 
          end_datetime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000).toISOString(), 
          location: 'CrossFit Box Brescia, Via San Zeno 99, Brescia', 
          location_lat: 45.5416,
          location_lng: 10.2118,
          description: 'Grande raduno CrossFit aperto a tutti i livelli! WOD di gruppo, sfide a squadre e tanto divertimento. Portate energia e voglia di sudare! 💪', 
          is_public: true, 
          is_all_day: false 
        },
        // 2. Cena Fit Milano - Evento (+14 giorni)
        { 
          creator_user_id: pt2Id, 
          pt_user_id: pt2Id, 
          title: 'Cena Fit Milano', 
          event_type: 'evento', 
          start_datetime: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000 + 20 * 60 * 60 * 1000).toISOString(), 
          end_datetime: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000).toISOString(), 
          location: 'Ristorante Healthy Bites, Corso Como 15, Milano', 
          location_lat: 45.4642,
          location_lng: 9.1900,
          description: 'Serata speciale per la community fitness! Menù studiato apposta per chi si allena: proteine, verdure e gusto. Occasione perfetta per conoscersi! 🍽️', 
          is_public: true 
        },
        // 3. Yoga al Parco Roma - Raduno (+10 giorni)
        { 
          creator_user_id: pt3Id, 
          pt_user_id: pt3Id, 
          title: 'Yoga al Parco', 
          event_type: 'raduno', 
          start_datetime: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000).toISOString(), 
          end_datetime: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000).toISOString(), 
          location: 'Villa Borghese, Piazzale del Museo Borghese, Roma', 
          location_lat: 41.9028,
          location_lng: 12.4964,
          description: 'Sessione di yoga all\'alba nel cuore di Roma. Adatto a tutti i livelli, portate il vostro tappetino! Pratica Vinyasa con meditazione finale. 🧘‍♀️', 
          is_public: true 
        },
        // 4. Gara Corsa 5K Torino - Gara (+21 giorni)
        { 
          creator_user_id: pt1Id, 
          pt_user_id: pt1Id, 
          title: 'Gara Corsa 5K', 
          event_type: 'gara', 
          start_datetime: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(), 
          end_datetime: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000).toISOString(), 
          location: 'Parco del Valentino, Torino', 
          location_lat: 45.0703,
          location_lng: 7.6869,
          description: 'Corsa amatoriale lungo il Po! Percorso di 5km adatto a tutti. Premiazioni per categorie età e tempo. Iscrizione gratuita per i membri della community! 🏃‍♂️', 
          is_public: true 
        },
      ];

      const { data: createdEvents, error: eventsError } = await supabase
        .from('calendar_events')
        .insert(events)
        .select();

      if (eventsError) {
        console.error('Error creating events:', eventsError);
      } else {
        results.events_created = createdEvents?.length || 0;
        
        // Add mock participants to public events
        if (createdEvents) {
          const publicEvents = createdEvents.filter((e: { is_public: boolean }) => e.is_public);
          const participantInserts = [];
          
          for (const event of publicEvents) {
            // Add 3-8 random participants from our test users
            const allUsers = [atleta1Id, atleta2Id, atleta3Id, pt1Id, pt2Id, pt3Id];
            const numParticipants = 3 + Math.floor(Math.random() * 6); // 3-8
            const shuffled = allUsers.sort(() => 0.5 - Math.random());
            const participants = shuffled.slice(0, Math.min(numParticipants, allUsers.length));
            
            for (const userId of participants) {
              participantInserts.push({
                event_id: event.id,
                user_id: userId,
                status: 'registered'
              });
            }
          }
          
          if (participantInserts.length > 0) {
            const { error: participantsError } = await supabase
              .from('event_participants')
              .insert(participantInserts);
            
            if (participantsError) {
              console.error('Error creating event participants:', participantsError);
            } else {
              results.event_participants_created = participantInserts.length;
            }
          }
        }
      }
    }

    // 10. Create progress tracking data
    console.log('Creating progress tracking data...');
    const { data: existingProgress } = await supabase
      .from('progress_tracking')
      .select('id')
      .limit(1);

    if (!existingProgress || existingProgress.length === 0) {
      const progressEntries = [];
      const now = new Date();

      // Atleta1 - 10 entries over 30 days (weight loss journey)
      let weight = 82.5;
      for (let i = 0; i < 10; i++) {
        weight -= Math.random() * 0.5; // Gradual weight loss
        const date = new Date(now.getTime() - (30 - i * 3) * 24 * 60 * 60 * 1000);
        progressEntries.push({
          atleta_user_id: atleta1Id,
          tracked_date: date.toISOString().split('T')[0],
          weight_kg: Math.round(weight * 10) / 10,
          energy_level: Math.floor(Math.random() * 2) + 4, // 4-5
          mood_level: Math.floor(Math.random() * 2) + 4, // 4-5
          sleep_hours: 6.5 + Math.random() * 2, // 6.5-8.5
          sleep_quality: Math.floor(Math.random() * 2) + 4, // 4-5
          waist_cm: 88 - i * 0.3,
          chest_cm: 102 + i * 0.1,
          notes: i === 9 ? 'Mi sento in ottima forma!' : null
        });
      }

      // Atleta2 - 5 entries (maintenance phase)
      weight = 70;
      for (let i = 0; i < 5; i++) {
        const date = new Date(now.getTime() - (45 - i * 7) * 24 * 60 * 60 * 1000);
        progressEntries.push({
          atleta_user_id: atleta2Id,
          tracked_date: date.toISOString().split('T')[0],
          weight_kg: 70 + (Math.random() - 0.5),
          energy_level: Math.floor(Math.random() * 2) + 3, // 3-4
          mood_level: Math.floor(Math.random() * 2) + 3, // 3-4
          sleep_hours: 7 + Math.random(),
          sleep_quality: Math.floor(Math.random() * 2) + 3, // 3-4
        });
      }

      // Atleta3 - 5 entries (starting journey)
      weight = 78;
      for (let i = 0; i < 5; i++) {
        const date = new Date(now.getTime() - (10 - i * 2) * 24 * 60 * 60 * 1000);
        progressEntries.push({
          atleta_user_id: atleta3Id,
          tracked_date: date.toISOString().split('T')[0],
          weight_kg: 78 - i * 0.2,
          energy_level: 3 + Math.floor(i / 2), // Improving energy
          mood_level: 3 + Math.floor(i / 2), // Improving mood
          sleep_hours: 6 + Math.random() * 1.5,
          sleep_quality: 3 + Math.floor(Math.random() * 2),
          notes: i === 0 ? 'Inizio del mio percorso fitness!' : null
        });
      }

      const { data: createdProgress, error: progressError } = await supabase
        .from('progress_tracking')
        .insert(progressEntries)
        .select();

      if (progressError) {
        console.error('Error creating progress:', progressError);
      } else {
        results.progress_entries_created = createdProgress?.length || 0;
      }
    }

    // 11. Create additional badges
    console.log('Creating badges...');
    const { data: existingBadges } = await supabase
      .from('badges')
      .select('id')
      .limit(1);

    if (!existingBadges || existingBadges.length === 0) {
      const badges = [
        { name: 'Primo Allenamento', description: 'Hai completato il tuo primo allenamento!', category: 'milestone', points: 10, criteria: { type: 'workout_count', value: 1 }, is_active: true },
        { name: 'Settimana Perfetta', description: 'Hai completato tutti gli allenamenti della settimana', category: 'consistency', points: 25, criteria: { type: 'weekly_completion', value: 1 }, is_active: true },
        { name: 'Mese di Fuoco', description: '30 giorni consecutivi di allenamento', category: 'consistency', points: 100, criteria: { type: 'streak', value: 30 }, is_active: true },
        { name: 'Obiettivo Raggiunto', description: 'Hai raggiunto un obiettivo personale', category: 'achievement', points: 50, criteria: { type: 'goal_completed', value: 1 }, is_active: true },
        { name: 'Prima Recensione', description: 'Hai lasciato la tua prima recensione', category: 'social', points: 15, criteria: { type: 'review_count', value: 1 }, is_active: true },
        { name: 'Trasformazione -5kg', description: 'Hai perso 5kg dal tuo peso iniziale', category: 'weight', points: 75, criteria: { type: 'weight_loss', value: 5 }, is_active: true },
        { name: 'Tecnica Perfetta', description: 'Il tuo PT ha valutato la tua tecnica come eccellente', category: 'skill', points: 30, criteria: { type: 'pt_rating', value: 5 }, is_active: true },
        { name: 'Early Bird', description: 'Hai completato 10 allenamenti prima delle 8:00', category: 'lifestyle', points: 20, criteria: { type: 'early_workouts', value: 10 }, is_active: true },
        { name: 'Guerriero del Weekend', description: 'Hai fatto 4 allenamenti di sabato/domenica', category: 'lifestyle', points: 20, criteria: { type: 'weekend_workouts', value: 4 }, is_active: true },
        { name: 'Super Atleta', description: 'Hai completato 50 allenamenti', category: 'milestone', points: 150, criteria: { type: 'workout_count', value: 50 }, is_active: true },
      ];

      const { data: createdBadges, error: badgesError } = await supabase
        .from('badges')
        .insert(badges)
        .select();

      if (badgesError) {
        console.error('Error creating badges:', badgesError);
      } else {
        results.badges_created = createdBadges?.length || 0;

        // Assign some badges to athletes
        if (createdBadges) {
          const firstWorkoutBadge = createdBadges.find(b => b.name === 'Primo Allenamento');
          const firstReviewBadge = createdBadges.find(b => b.name === 'Prima Recensione');
          
          const atletaBadges = [];
          if (firstWorkoutBadge) {
            atletaBadges.push({ atleta_user_id: atleta1Id, badge_id: firstWorkoutBadge.id });
            atletaBadges.push({ atleta_user_id: atleta2Id, badge_id: firstWorkoutBadge.id });
          }
          if (firstReviewBadge) {
            atletaBadges.push({ atleta_user_id: atleta1Id, badge_id: firstReviewBadge.id });
          }

          if (atletaBadges.length > 0) {
            await supabase.from('atleta_badges').insert(atletaBadges);
            results.atleta_badges_assigned = atletaBadges.length;
          }
        }
      }
    }

    // 12. Create notifications
    console.log('Creating notifications...');
    const { data: existingNotifs } = await supabase
      .from('notifications')
      .select('id')
      .limit(1);

    if (!existingNotifs || existingNotifs.length === 0) {
      const now = new Date();
      const notifications = [
        // For Atleta1
        { user_id: atleta1Id, type: 'workout', title: 'Nuovo allenamento assegnato', body: 'Il tuo PT ha preparato un nuovo workout per te!', action_url: '/app/workouts', created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString() },
        { user_id: atleta1Id, type: 'message', title: 'Nuovo messaggio', body: 'Marco ti ha scritto un messaggio', action_url: '/app/chat', created_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString() },
        { user_id: atleta1Id, type: 'badge', title: 'Badge sbloccato! 🎉', body: 'Hai ottenuto il badge "Primo Allenamento"', created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), is_read: true },
        // For Atleta2
        { user_id: atleta2Id, type: 'subscription', title: 'Abbonamento scaduto', body: 'Il tuo pacchetto è terminato. Rinnova per continuare!', action_url: '/app/subscription', created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString() },
        // For Atleta3
        { user_id: atleta3Id, type: 'connection', title: 'Benvenuto! 🎉', body: 'Sei ora collegato con il tuo Personal Trainer', action_url: '/app', created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() },
        { user_id: atleta3Id, type: 'workout', title: 'Primo allenamento schedulato', body: 'La tua prima sessione di valutazione è pronta', action_url: '/app/workouts', created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() },
        // For PT1
        { user_id: pt1Id, type: 'connection', title: 'Nuovo atleta collegato', body: 'Un nuovo atleta si è unito al tuo team!', action_url: '/pt/athletes', created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() },
        { user_id: pt1Id, type: 'review', title: 'Nuova recensione ⭐', body: 'Hai ricevuto una recensione a 5 stelle!', action_url: '/pt/reviews', created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() },
        // For PT2
        { user_id: pt2Id, type: 'message', title: 'Messaggio non letto', body: 'Hai un messaggio in attesa di risposta', action_url: '/pt/messages', created_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString() },
      ];

      const { data: createdNotifs, error: notifsError } = await supabase
        .from('notifications')
        .insert(notifications)
        .select();

      if (notifsError) {
        console.error('Error creating notifications:', notifsError);
      } else {
        results.notifications_created = createdNotifs?.length || 0;
      }
    }

    console.log('Seed completed!', results);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Platform data seeded successfully',
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Seed error:', error);
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
