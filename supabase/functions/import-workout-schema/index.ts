import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const PROMPT = `You are a fitness assistant. Analyze this document which is a workout template created by a Personal Trainer. Extract all exercises and return ONLY a valid JSON object with this exact structure, no preamble, no markdown:

{
  template_name: string,
  exercises: [
    {
      name: string,
      sets: number,
      reps: number | null,
      rest_seconds: number | null,
      protocol_type: 'standard' | 'emom' | 'amrap' | 'superset' | 'hiit' | 'tabata',
      notes: string | null,
      protocol_config: object | null
    }
  ]
}

protocol_type defaults to 'standard' if unclear.
rest_seconds: convert any rest notation (90', 90s, 1'30'') to seconds.
If the document is in Italian, translate exercise names to Italian.`;

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

    const gatewayRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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

    if (!gatewayRes.ok) {
      const errText = await gatewayRes.text();
      console.error('AI gateway error:', gatewayRes.status, errText);
      if (gatewayRes.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please retry shortly.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (gatewayRes.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted, please top up the workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'AI gateway error', status: gatewayRes.status, details: errText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await gatewayRes.json();
    const textOutput: string = data?.choices?.[0]?.message?.content ?? '';

    let parsed;
    try {
      const cleaned = textOutput.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (_e) {
      console.error('Failed to parse model JSON:', textOutput);
      return new Response(
        JSON.stringify({ error: 'Failed to parse JSON from model', raw: textOutput }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify(parsed), {
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
