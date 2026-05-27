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

    const mediaType = isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const contentBlock = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: mediaType, data: file_base64 } }
      : { type: 'document', source: { type: 'base64', media_type: mediaType, data: file_base64 } };

    let anthropicRes: Response;
    try {
      anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: [
                contentBlock,
                { type: 'text', text: PROMPT },
              ],
            },
          ],
        }),
      });
    } catch (err) {
      console.error('Anthropic fetch failed:', err);
      return new Response(
        JSON.stringify({ error: 'API call failed', details: err instanceof Error ? err.message : String(err) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('Anthropic API error:', anthropicRes.status, errText);
      return new Response(
        JSON.stringify({ error: 'API call failed', details: errText, status: anthropicRes.status }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await anthropicRes.json();
    const textOutput: string = data?.content?.[0]?.text ?? '';

    console.log('Raw Claude response:', textOutput);

    let parsed;
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
