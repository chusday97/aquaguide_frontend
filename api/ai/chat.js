const aiRateLimitWindowMs = 60 * 1000;
const aiRateLimitMaxRequests = 10;
const aiRequestTimeoutMs = Number(process.env.AI_TIMEOUT_MS || 20 * 1000);
const aiRateLimitBuckets = new Map();
const isConfiguredApiKey = (apiKey) => Boolean(apiKey && apiKey !== 'MY_DEEPSEEK_API_KEY' && apiKey !== 'MY_AI_API_KEY');

const getClientId = (req) => {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwardedFor || req.socket?.remoteAddress || 'unknown';
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

// Keep this protocol in sync with server/index.mjs and functions/api/ai/chat.js.
const buildRiskExplanationPrompt = (context = {}) => {
  const compactContext = JSON.stringify(context, null, 2).slice(0, 12000);
  const system = [
    '你是 AquaGuide 的风险解释助手。',
    '你不能重新判断风险等级，不能判断能不能养，不能覆盖 canAdd、riskLevel、spaceFit、waterFit、temperatureFit、pHFit、isCompatible。',
    '你必须只把 context.riskResult 和 context.ruleFacts 当作事实依据。',
    '如果信息不足，只能写“信息不足”，不能编造鱼缸参数、生物冲突或检测结果。',
    '输出必须是合法 JSON，不要 Markdown，不要代码块，不要额外解释。',
    '文案面向普通养鱼用户，简洁、具体、可执行。',
  ].join('\n');
  const user = [
    '请根据下面 AquaGuide 本地规则已经算出的结果，生成风险解释和调整建议。',
    '再次强调：最终判断以本地规则为准，你只负责解释，不负责重新判断。',
    '',
    '必须返回这个 JSON 结构：',
    JSON.stringify({
      summary: '一句话总结当前风险',
      reasons: [
        {
          title: '原因标题',
          detail: '原因解释',
          source: '来自本地规则：空间 / 水温 / pH / 混养 / 性情',
        },
      ],
      suggestions: [
        {
          title: '调整建议',
          detail: '具体怎么做',
        },
      ],
      nextSteps: ['下一步 1', '下一步 2'],
      disclaimer: '最终判断以系统规则结果为准',
    }, null, 2),
    '',
    'context:',
    compactContext,
  ].join('\n');

  return { system, messages: [{ role: 'user', content: user }], temperature: 0.2, maxTokens: 900, thinking: 'disabled' };
};

const buildRiskAuditPrompt = (context = {}) => {
  const compactContext = JSON.stringify(context, null, 2).slice(0, 14000);
  const system = [
    '你是 AquaGuide 的风险审计助手。',
    '你只能检查本地规则结果是否遗漏了需要提醒用户确认的风险点。',
    '你不能重新决定 canAdd，不能覆盖本地 riskLevel，不能覆盖 temperatureFit、spaceFit、pHFit、hardnessFit、equipmentFit、compatibilityFit。',
    '你必须把 context.ruleResult 作为系统结论，把 aquarium、selectedSpecies、existingLivestock 作为事实输入。',
    '不能编造输入中不存在的生物；如果 existingLivestock 没有金鱼，就不能提金鱼。',
    '如果信息不足，只能输出 uncertainItems 或低强度 missingRisks，不能直接判定高风险。',
    '如果所有已知条件匹配，只能提示无额外风险或需要补充确认，不能凭空制造风险。',
    '输出必须是合法 JSON，不要 Markdown，不要代码块，不要额外解释。',
  ].join('\n');
  const user = [
    '请审计下面 AquaGuide 本地规则结果，找出可能遗漏但不能覆盖本地结论的补充风险。',
    '返回 JSON 必须符合这个结构：',
    JSON.stringify({
      hasAdditionalRisk: false,
      additionalRiskLevel: 'none',
      missingRisks: [
        {
          type: 'water_parameter_unknown',
          title: '需要确认 pH / 硬度',
          reason: '当前鱼缸未填写 pH 和硬度，无法完整判断水质适配。',
          severity: 'low',
          evidence: '输入中 ph 和 hardness 为 null',
        },
      ],
      uncertainItems: [
        {
          title: '缺少设备信息',
          reason: '未提供过滤和加热设备信息，因此只能提醒确认。',
        },
      ],
      userFacingSummary: '当前硬性条件基本匹配，但建议补充确认 pH、硬度和设备信息。',
      suggestions: ['补充 pH 和硬度数据', '确认过滤设备是否稳定运行'],
    }, null, 2),
    '',
    'context:',
    compactContext,
  ].join('\n');

  return { system, messages: [{ role: 'user', content: user }], temperature: 0.15, maxTokens: 1100, thinking: 'disabled' };
};

const parseJsonObject = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI 返回的内容不是 JSON。');
    return JSON.parse(match[0]);
  }
};

const normalizeRiskExplanationData = (data) => ({
  summary: typeof data?.summary === 'string' ? data.summary : '已根据系统规则生成风险说明。',
  reasons: Array.isArray(data?.reasons)
    ? data.reasons.slice(0, 5).map(item => ({
      title: typeof item?.title === 'string' ? item.title : '风险原因',
      detail: typeof item?.detail === 'string' ? item.detail : '信息不足。',
      source: typeof item?.source === 'string' ? item.source : '来自本地规则',
    }))
    : [],
  suggestions: Array.isArray(data?.suggestions)
    ? data.suggestions.slice(0, 5).map(item => ({
      title: typeof item?.title === 'string' ? item.title : '调整建议',
      detail: typeof item?.detail === 'string' ? item.detail : '先参考系统规则结果逐项调整。',
    }))
    : [],
  nextSteps: Array.isArray(data?.nextSteps)
    ? data.nextSteps.filter(step => typeof step === 'string').slice(0, 5)
    : [],
  disclaimer: '最终判断以系统规则结果为准',
});

const normalizeRiskAuditData = (data) => {
  const allowedLevels = new Set(['none', 'low', 'medium', 'high']);
  return {
    hasAdditionalRisk: Boolean(data?.hasAdditionalRisk),
    additionalRiskLevel: allowedLevels.has(data?.additionalRiskLevel) ? data.additionalRiskLevel : 'none',
    missingRisks: Array.isArray(data?.missingRisks)
      ? data.missingRisks.slice(0, 5).map(item => ({
        type: typeof item?.type === 'string' ? item.type : 'unknown',
        title: typeof item?.title === 'string' ? item.title : '需要补充确认',
        reason: typeof item?.reason === 'string' ? item.reason : '信息不足，无法完整判断。',
        severity: ['low', 'medium', 'high'].includes(item?.severity) ? item.severity : 'low',
        evidence: typeof item?.evidence === 'string' ? item.evidence : '来自输入信息',
      }))
      : [],
    uncertainItems: Array.isArray(data?.uncertainItems)
      ? data.uncertainItems.slice(0, 5).map(item => ({
        title: typeof item?.title === 'string' ? item.title : '信息不足',
        reason: typeof item?.reason === 'string' ? item.reason : '需要补充数据后再确认。',
      }))
      : [],
    userFacingSummary: typeof data?.userFacingSummary === 'string' ? data.userFacingSummary : 'AI 未发现额外明显风险。',
    suggestions: Array.isArray(data?.suggestions)
      ? data.suggestions.filter(item => typeof item === 'string').slice(0, 5)
      : [],
  };
};

const fetchWithTimeout = async (url, options, timeoutMs = aiRequestTimeoutMs) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const parseBody = (body) => {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const rateLimit = checkAiRateLimit(getClientId(req));
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
    return res.status(429).json({ ok: false, error: `请求太频繁，请 ${rateLimit.retryAfterSeconds} 秒后再试。` });
  }

  const apiKey = process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY;
  const aiBaseUrl = (process.env.AI_BASE_URL || process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
  const aiModel = process.env.AI_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

  if (!isConfiguredApiKey(apiKey)) {
    return res.status(503).json({ ok: false, error: 'AI provider is not configured' });
  }

  const body = parseBody(req.body);
  const { task, context } = body;
  const requestInput = task === 'risk_explanation'
    ? buildRiskExplanationPrompt(context)
    : task === 'risk_audit'
      ? buildRiskAuditPrompt(context)
      : body;
  const { messages, system, temperature = 0.4, maxTokens = 1200, thinking = 'disabled' } = requestInput;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json(task ? { ok: false, error: 'messages 不能为空。' } : { error: 'messages 不能为空。' });
  }

  const normalizedMessages = messages
    .filter(message => message && typeof message.content === 'string')
    .map(message => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content,
    }));

  const payload = {
    model: aiModel,
    messages: system ? [{ role: 'system', content: String(system) }, ...normalizedMessages] : normalizedMessages,
    temperature,
    max_tokens: maxTokens,
    stream: false,
    thinking: { type: thinking === 'enabled' ? 'enabled' : 'disabled' },
  };

  try {
    const aiResponse = await fetchWithTimeout(`${aiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await aiResponse.text();
    if (!aiResponse.ok) {
      return res.status(502).json(task ? {
        ok: false,
        error: `AI 请求失败：${responseText.slice(0, 300)}`,
      } : {
        error: `DeepSeek 请求失败：${responseText.slice(0, 300)}`,
      });
    }

    const data = JSON.parse(responseText);
    const content = data.choices?.[0]?.message?.content || '';
    if (task === 'risk_explanation') {
      const parsed = parseJsonObject(content);
      return res.json({
        ok: true,
        task: 'risk_explanation',
        data: normalizeRiskExplanationData(parsed),
      });
    }
    if (task === 'risk_audit') {
      const parsed = parseJsonObject(content);
      return res.json({
        ok: true,
        task: 'risk_audit',
        data: normalizeRiskAuditData(parsed),
      });
    }

    return res.json({
      content,
      model: data.model || aiModel,
      usage: data.usage,
    });
  } catch (error) {
    return res.status(500).json(task ? {
      ok: false,
      error: error?.name === 'AbortError' ? 'AI request timed out' : 'AI request failed',
    } : {
      ok: false,
      error: error?.name === 'AbortError' ? 'AI request timed out' : 'AI request failed',
    });
  }
}
