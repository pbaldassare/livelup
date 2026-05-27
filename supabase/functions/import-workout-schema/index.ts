import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const PROMPT = `Sei un assistente fitness esperto. Analizza questo documento, una scheda di allenamento creata da un Personal Trainer italiano.

OBIETTIVO: Estrarre gli esercizi e creare UN template di allenamento per OGNI sessione trovata nel documento (es. Sessione A, Sessione B, Sessione C → 3 template separati). Se c'è una sola sessione, restituisci un array con un solo template.

IGNORA COMPLETAMENTE:
- Progressione settimanale (colonne W1, W2, W3, W4 — usa solo i valori di W1 come default)
- Frequenza settimanale o scheduling (quante volte a settimana)
- Riscaldamento e defaticamento (respirazione, stretching, mobilità)
- Protocolli di recupero fuori dall'allenamento
- Tabelle di monitoraggio o tabelle note generiche

ESTRAI e mappa correttamente:
- Nome esercizio: in italiano, come scritto nel documento
- sets: usa il primo valore disponibile (W1 o il singolo valore indicato)
- reps: valore numerico; se "max" usa null e aggiungi "AMRAP" nelle notes
- rest_seconds: converti qualsiasi formato in secondi (90" = 90, 1' = 60, 2'→1' usa il primo = 120, 1'30'' = 90)
- Notazione TUT/tempo (es. 20X0, 30X1, 2010): salva COSÌ COM'È nel campo notes come "TUT: 20X0" (concatenato ad altre note se presenti)
- protocol_type:
  * "JUMP SET" o esercizi etichettati A1/A2/A3 nello stesso blocco → "superset"
  * "HIIT" o "30 ON 90 OFF" o lavoro/riposo a tempo → "hiit"
  * "EMOM" → "emom"
  * "AMRAP" → "amrap"
  * "TABATA" → "tabata"
  * tutto il resto → "standard"
- Per blocchi superset: raggruppa esercizi con lo stesso prefisso lettera (A1+A2+A3 = un superset gruppo "A", B1+B2+B3 = gruppo "B") e imposta protocol_config: { "group": "A" }
- Per esercizi HIIT: imposta protocol_config: { "work_seconds": 30, "rest_seconds": 90 } usando i valori trovati nel documento

FORMATO OUTPUT — restituisci SOLO un array JSON valido, senza preamboli, senza markdown, senza backticks:
[
  {
    "template_name": "Sessione A — Nome Programma",
    "exercises": [
      {
        "name": string,
        "sets": number,
        "reps": number | null,
        "rest_seconds": number | null,
        "protocol_type": "standard" | "emom" | "amrap" | "superset" | "hiit" | "tabata",
        "notes": string | null,
        "protocol_config": object | null
      }
    ]
  }
]`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { file_base64, mime_type } = await req.json();

    if (!file_base64 || !mime_type) {
      return new Response(
        JSON.stringify({ error: 'Missing file_base64 or mime_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isPdf = mime_type === 'application/pdf';
    const isExcel = mime_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    if (!isPdf && !isExcel) {
      return new Response(
        JSON.stringify({ error: 'Unsupported mime_type. Use PDF or XLSX.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dataUrl = `data:${mime_type};base64,${file_base64}`;

    let gatewayRes: Response;
    try {
      gatewayRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-pro',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: dataUrl } },
                { type: 'text', text: PROMPT },
              ],
            },
          ],
          response_format: { type: 'json_object' },
        }),
      });
    } catch (err) {
      console.error('Gateway fetch failed:', err);
      return new Response(
        JSON.stringify({ error: 'API call failed', details: err instanceof Error ? err.message : String(err) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!gatewayRes.ok) {
      const errText = await gatewayRes.text();
      console.error('Gateway API error:', gatewayRes.status, errText);
      if (gatewayRes.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (gatewayRes.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required, please add credits to your Lovable workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'API call failed', details: errText, status: gatewayRes.status }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await gatewayRes.json();
    const textOutput: string = data?.choices?.[0]?.message?.content ?? '';

    console.log('Raw gateway response content:', textOutput);

    let parsed: unknown;
    try {
      const cleaned = textOutput.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (_e) {
      console.error('Failed to parse model JSON:', textOutput);
      return new Response(
        JSON.stringify({ error: 'JSON parse failed', raw: textOutput }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize: ensure we return an array of templates.
    // response_format: json_object forces an object, so the model may wrap the array
    // under a key like "templates" or "sessions", or return a single template object.
    let templates: unknown[];
    if (Array.isArray(parsed)) {
      templates = parsed;
    } else if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      const arrayKey = Object.keys(obj).find((k) => Array.isArray(obj[k]));
      if (arrayKey && Array.isArray(obj[arrayKey])) {
        templates = obj[arrayKey] as unknown[];
      } else if ('exercises' in obj) {
        templates = [obj];
      } else {
        templates = [obj];
      }
    } else {
      templates = [];
    }

    return new Response(JSON.stringify({ templates }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('import-workout-schema error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
