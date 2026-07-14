import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Body {
  email: string
  firstName: string
  lastName: string
  tempPassword: string
  ptName?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY non configurata' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email, firstName, lastName, tempPassword, ptName }: Body = await req.json()
    if (!email || !firstName || !tempPassword) {
      return new Response(JSON.stringify({ error: 'Parametri mancanti' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const siteUrl = Deno.env.get('SITE_URL') || 'https://livellapp.iaconnect.it'
    const from = Deno.env.get('RESEND_FROM') || 'LIVELLAPP <onboarding@resend.dev>'
    const coach = ptName || 'Il tuo Personal Trainer'

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
        <h1 style="color:#0d4f4f">Benvenuto su LIVELLAPP, ${firstName}!</h1>
        <p>${coach} ti ha aggiunto come atleta sulla piattaforma LIVELLAPP.</p>
        <p>Ecco le tue credenziali temporanee per accedere:</p>
        <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:4px 0"><strong>Email:</strong> ${email}</p>
          <p style="margin:4px 0"><strong>Password temporanea:</strong> <code style="background:#fff;padding:4px 8px;border-radius:4px">${tempPassword}</code></p>
        </div>
        <p><a href="${siteUrl}/auth" style="display:inline-block;background:#D4FF00;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Accedi ora</a></p>
        <p style="color:#666;font-size:14px">Ti consigliamo di cambiare la password al primo accesso dalle impostazioni del tuo account.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#999;font-size:12px">Se non hai richiesto questo account, ignora questa email.</p>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `Benvenuto su LIVELLAPP — le tue credenziali di accesso`,
        html,
      }),
    })

    if (!res.ok) {
      const details = await res.text()
      console.error('Resend error', res.status, details)
      return new Response(JSON.stringify({ error: 'Invio email fallito', status: res.status, details }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await res.json()
    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
