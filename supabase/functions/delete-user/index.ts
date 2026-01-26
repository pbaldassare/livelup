import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the caller is an admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { userId, role } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log(`Deleting user ${userId} with role ${role}`);

    // 1. Delete related data based on role
    if (role === 'pt') {
      // Delete PT-specific data
      console.log('Cleaning up PT data...');
      
      // Delete workouts created by this PT
      await supabaseAdmin
        .from('workouts')
        .delete()
        .eq('pt_user_id', userId);
      
      // Delete workout templates
      await supabaseAdmin
        .from('workout_templates')
        .delete()
        .eq('pt_user_id', userId);
      
      // Delete exercises created by PT
      await supabaseAdmin
        .from('exercises')
        .delete()
        .eq('created_by', userId);

      // Delete PT availability
      await supabaseAdmin
        .from('pt_availability')
        .delete()
        .eq('pt_user_id', userId);
      
      // Delete PT content library
      await supabaseAdmin
        .from('pt_content_library')
        .delete()
        .eq('pt_user_id', userId);
      
      // Delete PT reviews (reviews of this PT)
      await supabaseAdmin
        .from('pt_reviews')
        .delete()
        .eq('pt_user_id', userId);
      
      // Delete connections where PT is involved
      await supabaseAdmin
        .from('pt_atleta_connections')
        .delete()
        .eq('pt_user_id', userId);
      
      // Delete chats where PT is involved
      await supabaseAdmin
        .from('chats')
        .delete()
        .eq('pt_user_id', userId);
      
      // Delete calendar events
      await supabaseAdmin
        .from('calendar_events')
        .delete()
        .or(`creator_user_id.eq.${userId},pt_user_id.eq.${userId}`);
      
      // Delete PT profile
      await supabaseAdmin
        .from('pt_profiles')
        .delete()
        .eq('user_id', userId);
        
    } else if (role === 'atleta') {
      // Delete Atleta-specific data
      console.log('Cleaning up Atleta data...');
      
      // Get workouts for this atleta first
      const { data: workoutsData } = await supabaseAdmin
        .from('workouts')
        .select('id')
        .eq('atleta_user_id', userId);
      
      if (workoutsData && workoutsData.length > 0) {
        const workoutIds = workoutsData.map(w => w.id);
        
        // Get workout exercises
        const { data: workoutExercises } = await supabaseAdmin
          .from('workout_exercises')
          .select('id')
          .in('workout_id', workoutIds);
        
        if (workoutExercises && workoutExercises.length > 0) {
          const exerciseIds = workoutExercises.map(e => e.id);
          await supabaseAdmin
            .from('workout_logs')
            .delete()
            .in('workout_exercise_id', exerciseIds);
        }
        
        // Delete workout exercises
        await supabaseAdmin
          .from('workout_exercises')
          .delete()
          .in('workout_id', workoutIds);
      }
      
      // Delete workouts assigned to this atleta
      await supabaseAdmin
        .from('workouts')
        .delete()
        .eq('atleta_user_id', userId);
      
      // Delete progress tracking
      await supabaseAdmin
        .from('progress_tracking')
        .delete()
        .eq('atleta_user_id', userId);
      
      // Delete atleta badges
      await supabaseAdmin
        .from('atleta_badges')
        .delete()
        .eq('atleta_user_id', userId);
      
      // Delete reviews made by this atleta
      await supabaseAdmin
        .from('pt_reviews')
        .delete()
        .eq('atleta_user_id', userId);
      
      // Delete connections where atleta is involved
      await supabaseAdmin
        .from('pt_atleta_connections')
        .delete()
        .eq('atleta_user_id', userId);
      
      // Delete chats where atleta is involved
      await supabaseAdmin
        .from('chats')
        .delete()
        .eq('atleta_user_id', userId);
      
      // Delete calendar events
      await supabaseAdmin
        .from('calendar_events')
        .delete()
        .or(`creator_user_id.eq.${userId},atleta_user_id.eq.${userId}`);
      
      // Delete atleta profile
      await supabaseAdmin
        .from('atleta_profiles')
        .delete()
        .eq('user_id', userId);
    }

    // 2. Delete common data (for both roles)
    console.log('Cleaning up common data...');
    
    // Delete notifications
    await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('user_id', userId);
    
    // Delete push subscriptions
    await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId);
    
    // Delete support tickets
    await supabaseAdmin
      .from('support_tickets')
      .delete()
      .eq('user_id', userId);
    
    // Delete subscriptions
    await supabaseAdmin
      .from('subscriptions')
      .delete()
      .eq('user_id', userId);
    
    // Delete payments
    await supabaseAdmin
      .from('payments')
      .delete()
      .eq('user_id', userId);
    
    // Delete coupon uses
    await supabaseAdmin
      .from('coupon_uses')
      .delete()
      .eq('user_id', userId);
    
    // Delete user roles
    await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId);
    
    // Delete base profile
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', userId);

    // 3. Delete the auth user
    console.log('Deleting auth user...');
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete user from auth: ' + deleteUserError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the action
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'delete_user',
        resource: role === 'pt' ? 'pt_profiles' : 'atleta_profiles',
        resource_id: userId,
        details: { deleted_user_id: userId, deleted_role: role }
      });

    console.log(`Successfully deleted user ${userId}`);

    return new Response(
      JSON.stringify({ success: true, message: 'User deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in delete-user function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
