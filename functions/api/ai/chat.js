const json = (body, init = {}) => new Response(JSON.stringify(body), {
  ...init,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    ...(init.headers || {}),
  },
});

export async function onRequestPost({ request, env }) {
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

