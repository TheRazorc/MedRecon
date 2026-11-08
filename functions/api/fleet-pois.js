// Endpoint Cloudflare Pages Functions: /api/fleet-pois
// Persistencia permanente en Cloudflare KV (FLEET_KV)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

export async function onRequestGet(context) {
  const { env } = context;
  try {
    if (env && env.FLEET_KV) {
      const stored = await env.FLEET_KV.get('fleet_pois', { type: 'json' });
      return new Response(JSON.stringify(stored || []), {
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
    }

    // Si aún no está vinculado el namespace KV, responde vacío sin error
    return new Response(JSON.stringify([]), {
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json'
      }
    });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const data = await request.json();
    if (!Array.isArray(data)) {
      return new Response(JSON.stringify({ error: 'Payload must be an array of POIs' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    if (env && env.FLEET_KV) {
      // Guardar permanentemente en KV (expiración opcional no seteada = permanente)
      await env.FLEET_KV.put('fleet_pois', JSON.stringify(data));
      return new Response(JSON.stringify({ success: true, count: data.length, syncedAt: Date.now() }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, count: data.length, note: 'FLEET_KV binding pending in Cloudflare' }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}
