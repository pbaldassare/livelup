import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const PROMPT = `You are an expert fitness assistant parsing Italian Personal Trainer workout sheets.
Your job is to extract exercises and return structured JSON.

RULES:

1. CREATE ONE TEMPLATE PER SESSION/GIORNO found in the document.
   Sessions may be labeled as: "GIORNO 1", "SESSIONE A", "UPPER", "LOWER",
   "HYROX", "HIIT", etc. Each becomes a separate template.

2. USE ONLY WEEK 1 / SETTIMANA 1 values (sets, reps, load).
   IGNORE all other weeks, progressions, deload weeks.

3. IGNORE completely: warm-up, cool-down, breathing exercises, stretching,
   mobility routines, scheduling tables, monitoring tables, feedback columns,
   weekly frequency, session frequency.

4. PROTOCOL TYPE mapping (use these exact values):
   - "TOP SET" or "BACK OFF" or "RAMPING" → "standard"
     (add the protocol name to notes field: "TOP SET", "BACK OFF", "RAMPING")
   - "TABATA" → "tabata"
   - "HIIT" or "RT" (Run + exercise circuit) → "hiit"
   - "EMOM" or "AMRAP Xmin" → use "emom" or "amrap" accordingly
   - "JUMP SET" or exercises with same letter prefix (A1/A2/A3, 1a/1b) → "superset"
   - Everything else → "standard"

5. SUPERSET grouping: exercises labeled 1a/1b, 2a/2b, A1/A2/A3 etc.
   belong to the same superset block. Set protocol_config: { "group": "1", "position": 1 }
   using the number/letter prefix as group and the order within the superset as position.

6. REPS:
   - If "MAX" or "AMRAP" → set reps to null, add "AMRAP" to notes
   - If time-based (es: "30\\"", "45\\"") → set reps to null,
     set rest_seconds to the rest value, add work duration to notes
   - Ranges like "8-10" → use the lower value (8)

7. REST: convert any format to seconds:
   - "2'" or "2min" → 120
   - "90\\"" or "90s" → 90
   - "2'→1'" → 120 (use first value)
   - "NO REST" → 0
   - If not specified → null

8. NOTES field: include any of these when present:
   - Protocol variant: "TOP SET", "BACK OFF", "RAMPING", "BACK OFF -15%"
   - TUT notation as-is: "TUT: 20X0"
   - Relevant coach annotations (brief, max 100 chars)
   - Work duration for timed exercises: "30\\" work"

9. SETS: use numeric value from Settimana 1. If not specified → null.

10. For CARDIO/RUN exercises (es: "700m Run", "Corsa"):
    set protocol_type to "standard", reps to null,
    add distance/instructions to notes.

Return ONLY a valid JSON array, no preamble, no markdown, no backticks:
[
  {
    "template_name": "Giorno 1 — Upper",
    "exercises": [
      {
        "name": "Nome esercizio in italiano",
        "sets": 4,
        "reps": 8,
        "rest_seconds": 120,
        "protocol_type": "standard",
        "notes": "TOP SET | TUT: 20X0",
        "protocol_config": null
      }
    ]
  }
]`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Require authenticated caller to prevent AI credit abuse
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub;
    const { data: roleRow } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', ['pt', 'admin'])
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
