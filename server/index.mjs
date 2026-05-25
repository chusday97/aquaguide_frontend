import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const port = Number(process.env.PORT || process.env.API_PORT || 8787);
const deepseekBaseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
const deepseekModel = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const aiRateLimitWindowMs = 60 * 1000;
const aiRateLimitMaxRequests = 10;
const aiRateLimitBuckets = new Map();

const getClientId = (req) => {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwardedFor || req.ip || req.socket?.remoteAddress || 'unknown';
};

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

app.use(express.json({ limit: '3mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    aiProvider: 'deepseek',
    model: deepseekModel,
    configured: Boolean(process.env.DEEPSEEK_API_KEY),
  });
});

app.post('/api/ai/chat', async (req, res) => {
  const rateLimit = checkAiRateLimit(getClientId(req));
  if (!rateLimit.allowed) {
    return res
      .status(429)
      .set('Retry-After', String(rateLimit.retryAfterSeconds))
      .json({ error: `请求太频繁，请 ${rateLimit.retryAfterSeconds} 秒后再试。` });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === 'MY_DEEPSEEK_API_KEY') {
    return res.status(503).json({
      error: 'AI 后端还没有配置 DeepSeek API Key。请在项目根目录创建 .env.local，并写入 DEEPSEEK_API_KEY=你的Key，然后重启 npm run dev。',
    });
  }

  const { messages, system, temperature = 0.4, maxTokens = 1200, thinking = 'disabled' } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages 不能为空。' });
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
      return res.status(502).json({
        error: `DeepSeek 请求失败：${responseText.slice(0, 300)}`,
      });
    }

    const data = JSON.parse(responseText);
    res.json({
      content: data.choices?.[0]?.message?.content || '',
      model: data.model || deepseekModel,
      usage: data.usage,
    });
  } catch (error) {
    console.error('DeepSeek proxy error:', error);
    res.status(500).json({ error: 'AI 后端请求失败，请检查 DeepSeek Key、余额或网络连接。' });
  }
});

const distPath = path.resolve(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`AquaGuide API server running at http://localhost:${port}`);
});
