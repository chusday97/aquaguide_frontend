const json = (body, init = {}) => new Response(JSON.stringify(body), {
  ...init,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    ...(init.headers || {}),
  },
});

export function onRequestGet({ env }) {
  return json({
    ok: true,
    aiProvider: 'deepseek',
    model: env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
    configured: Boolean(env.DEEPSEEK_API_KEY && env.DEEPSEEK_API_KEY !== 'MY_DEEPSEEK_API_KEY'),
  });
}

