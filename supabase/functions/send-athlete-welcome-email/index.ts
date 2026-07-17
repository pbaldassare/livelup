import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  sendAthleteWelcomeEmail,
  type WelcomeEmailPayload,
} from '../_shared/athleteWelcomeEmail.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = (await req.json()) as WelcomeEmailPayload

    if (
      !body?.to?.trim() ||
      !body?.firstName?.trim() ||
      !body?.lastName?.trim() ||
      !body?.temporaryPassword
    ) {
      return new Response(JSON.stringify({ error: 'Campi obbligatori mancanti' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result = await sendAthleteWelcomeEmail({
      to: body.to.trim().toLowerCase(),
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      ptName: body.ptName?.trim() || 'Il tuo Personal Trainer',
      temporaryPassword: body.temporaryPassword,
    })

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Errore interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
