import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const base = Deno.env.get('NUTRITION_FOOD_API_URL')?.replace(/\/$/, '');
  if (!base) {
    return new Response(JSON.stringify({ error: 'NUTRITION_FOOD_API_URL not configured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  let path = url.pathname.replace(/.*\/nutrition-food-proxy/, '') || '';
  if (!path) path = url.searchParams.get('path') || '/search';
  const target = `${base}${path.startsWith('/') ? path : `/${path}`}${url.search}`;

  try {
    const upstream = await fetch(target, {
      headers: { Accept: 'application/json' },
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { ...corsHeaders, 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
