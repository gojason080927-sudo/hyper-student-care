import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = Deno.env.get('SUPABASE_URL')
  const key =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !key) {
    return jsonResponse({ ok: false, error: 'Supabase env missing' }, 500)
  }

  const supabase = createClient(url, key)
  const { data, error } = await supabase.rpc('generate_weekly_learning_summaries')
  if (error) {
    return jsonResponse({ ok: false, error: error.message }, 500)
  }

  return jsonResponse({
    ok: true,
    inserted: typeof data === 'number' ? data : Number(data ?? 0),
  })
})
