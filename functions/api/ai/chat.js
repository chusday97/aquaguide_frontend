const json = (body, init = {}) => new Response(JSON.stringify(body), {
  ...init,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    ...(init.headers || {}),
  },
});

const aiRateLimitWindowMs = 60 * 1000;
const aiRateLimitMaxRequests = 10;
const aiRateLimitBuckets = new Map();

const getClientId = (request) => (
  request.headers.get('CF-Connecting-IP')
  || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  || 'unknown'
);

const checkAiRateLimit = (clientId) => {
  const now = Date.now();
  const bucket = aiRateLimitBuckets.get(clientId);

  if (!bucket || now - bucket.windowStart >= aiRateLimitWindowMs) {
    aiRateLimitBuckets.set(clientId, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= aiRateLimitMaxRequests) {
    const retryAfterSeconds = Math.ceil((aiRateLimitWindowMs - (now - bucket.windowStart)) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
};

export async function onRequestPost({ request, env }) {
  const rateLimit = checkAiRateLimit(getClientId(request));
  if (!rateLimit.allowed) {
    return json(
      { error: `请求太频繁，请 ${rateLimit.retryAfterSeconds} 秒后再试。` },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    );
  }

  const apiKey = env.DEEPSEEK_API_KEY;
  const deepseekBaseUrl = (env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
  const deepseekModel = env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

  if (!apiKey || apiKey === 'MY_DEEPSEEK_API_KEY') {
    return json({
      error: 'AI 后端还没有配置 DeepSeek API Key。请在 Cloudflare Pages 的环境变量里设置 DEEPSEEK_API_KEY。',
    }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const { messages, system, temperature = 0.4, maxTokens = 1200, thinking = 'disabled' } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: 'messages 不能为空。' }, { status: 400 });
  }

  const normalizedMessages = messages
    .filter(message => message && typeof message.content === 'string')
    .map(message => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content,
    }));

  const payload = {
    model: deepseekModel,
    messages: system ? [{ role: 'system', content: String(system) }, ...normalizedMessages] : normalizedMessages,
    temperature,
    max_tokens: maxTokens,
    stream: false,
    thinking: { type: thinking === 'enabled' ? 'enabled' : 'disabled' },
  };

  try {
    const deepseekResponse = await fetch(`${deepseekBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await deepseekResponse.text();
    if (!deepseekResponse.ok) {
      return json({
        error: `DeepSeek 请求失败：${responseText.slice(0, 300)}`,
      }, { status: 502 });
    }

    const data = JSON.parse(responseText);
    return json({
      content: data.choices?.[0]?.message?.content || '',
      model: data.model || deepseekModel,
      usage: data.usage,
    });
  } catch (error) {
    return json({
      error: 'AI 后端请求失败，请检查 DeepSeek Key、余额或网络连接。',
    }, { status: 500 });
  }
}
