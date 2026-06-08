const json = (body, init = {}) => new Response(JSON.stringify(body), {
  ...init,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    ...(init.headers || {}),
  },
});

export function onRequestGet({ env }) {
  const apiKey = env.AI_API_KEY || env.DEEPSEEK_API_KEY;
  return json({
    ok: true,
    aiProvider: 'deepseek',
    model: env.AI_MODEL || env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
    configured: Boolean(apiKey && apiKey !== 'MY_DEEPSEEK_API_KEY' && apiKey !== 'MY_AI_API_KEY'),
  });
}
