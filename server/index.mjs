import dotenv from 'dotenv';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env.local') });
dotenv.config({ path: path.join(rootDir, '.env') });
const app = express();

const port = Number(process.env.PORT || process.env.API_PORT || 8787);
const aiProvider = 'deepseek';
const aiBaseUrl = (process.env.AI_BASE_URL || process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
const aiModel = process.env.AI_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const aiRateLimitWindowMs = 60 * 1000;
const aiRateLimitMaxRequests = 10;
const aiRequestTimeoutMs = Number(process.env.AI_TIMEOUT_MS || 20 * 1000);
const aiRateLimitBuckets = new Map();
const isConfiguredApiKey = (apiKey) => Boolean(apiKey && apiKey !== 'MY_DEEPSEEK_API_KEY' && apiKey !== 'MY_AI_API_KEY');
const pickConfiguredApiKey = (...keys) => keys.find(isConfiguredApiKey) || '';

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

app.get(['/api/health', '/api/v1/health'], (_req, res) => {
  res.json({
    ok: true,
    provider: aiProvider,
    aiProvider,
    model: aiModel,
    configured: Boolean(pickConfiguredApiKey(process.env.AI_API_KEY, process.env.DEEPSEEK_API_KEY)),
    timeoutMs: aiRequestTimeoutMs,
  });
});

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
      statusRestatement: context?.finalStatus || context?.riskResult?.status || context?.ruleResult?.status || '必须和系统状态一致',
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

const buildRecommendationAssistPrompt = (context = {}) => {
  const compactContext = JSON.stringify(context, null, 2).slice(0, 15000);
  const system = [
    '你是 AquaGuide 的缸内生物推荐解释助手。',
    '本地规则已经完成安全过滤。你只能基于 safeCandidates、adjustableCandidates、blockedSummary 和 ruleFacts 做偏好解析、候选排序解释和分阶段加入计划。',
    '你不能创建数据库不存在的生物，不能把 hardBlock 或 blockedSummary 里的生物加回候选。',
    '你不能修改 canAdd、风险等级、适配结论，也不能把未知兼容性当成安全。',
    '如果信息不足，只能提出 questions，不能编造鱼缸里不存在的生物或设备。',
    '输出必须是合法 JSON，不要 Markdown，不要代码块，不要额外解释。',
  ].join('\n');
  const user = [
    '请根据下面本地规则结果，为用户生成推荐解释和分阶段加入计划。',
    '返回 JSON 必须符合这个结构：',
    JSON.stringify({
      structuredPreference: {
        experience: 'beginner',
        maintenance: 'low',
        visualStyle: ['群游', '低维护'],
        keywords: ['灯鱼', '虾'],
      },
      ranking: [
        { speciesId: 'species-id', reason: '为什么这个候选更符合偏好' },
      ],
      explanations: ['一句用户能理解的推荐理由'],
      stagedPlan: ['第一周先加入少量候选并观察'],
      questions: ['如果缺少信息，询问一个关键问题'],
    }, null, 2),
    '',
    'context:',
    compactContext,
  ].join('\n');

  return { system, messages: [{ role: 'user', content: user }], temperature: 0.2, maxTokens: 1000, thinking: 'disabled' };
};

const buildTankCopilotPrompt = (context = {}) => {
  const compactContext = JSON.stringify(context, null, 2).slice(0, 15000);
  const system = [
    '你是 AquaGuide 的 AI 建缸规划 Copilot。',
    '你的任务是理解用户想建什么缸，识别缺失信息，并把本地规则工具已经筛出的安全候选组织成可执行方案。',
    '你不能重新判断 canAdd，不能覆盖风险等级，不能把 blockedReasons 中的生物重新加入推荐。',
    '你不能编造数据库不存在的生物、鱼缸设备或用户没有提供的数据。',
    '你只能基于 context.goal、context.answers、context.aquariumSummary、context.missingInformation、context.safeCandidates、context.adjustableCandidates 和 context.blockedReasons 工作。',
    '如果缺失信息较多，最多追问 3 个关键问题，不要直接生成确定推荐。',
    '输出必须是合法 JSON，不要 Markdown，不要代码块，不要额外解释。',
  ].join('\n');
  const user = [
    '请为用户生成一个建缸规划 Copilot 回复。回复必须可执行、简短，并尊重本地规则结果。',
    '返回 JSON 必须符合这个结构：',
    JSON.stringify({
      goalUnderstanding: '一句话说明你理解的用户目标',
      missingQuestions: [
        { id: 'tank-size', prompt: '鱼缸尺寸或容量是多少？', informationKey: 'tank_size' },
      ],
      planSummary: '一个简短、可执行的推荐方案摘要',
      recommendedActions: [{ type: 'complete_tank_info', label: '完善鱼缸信息' }],
      selectedCandidateIds: ['只能从本地候选池选择的 species-id'],
      blockedExplanation: ['不建议方向或生物的原因'],
    }, null, 2),
    '',
    'recommendedActions 最多 2 个，type 只能是 complete_tank_info、view_safe_candidates、start_addition_simulation、restart_goal。',
    'selectedCandidateIds 只能来自 context.safeCandidates 或 context.adjustableCandidates。',
    'missingQuestions 最多 3 个，informationKey 只能是 tank_size、water_type、temperature、filter、preference、other。',
    '',
    'context:',
    compactContext,
  ].join('\n');

  return { system, messages: [{ role: 'user', content: user }], temperature: 0.2, maxTokens: 1100, thinking: 'disabled' };
};

const buildTankDailyCheckPrompt = (context = {}) => {
  const compactContext = JSON.stringify(context, null, 2).slice(0, 16000);
  const system = [
    '你是 AquaGuide 的每日鱼缸检查解释助手。',
    '本地规则已经确定风险等级、立即动作、禁止动作和候选百科。你只能理解用户自然语言、整理可能关联和生成补充问题。',
    '你不能降低 deterministicResult 的风险，不能删除或弱化立即动作和禁止动作，不能诊断疾病，不能给出自动用药建议。',
    'recommendedArticleIds 只能来自 candidateArticles，不能虚构文章。',
    '输出必须是合法 JSON，不要 Markdown，不要代码块，不要额外解释。',
  ].join('\n');
  const user = [
    '请结合鱼缸快照、结构化回答、用户补充描述和本地确定性结果生成解释。',
    '返回 JSON 必须符合：',
    JSON.stringify({
      summary: '一句话解释当前情况',
      priority: 'routine | watch | urgent',
      reasoning: ['只基于输入事实的关联原因'],
      recommendedArticleIds: ['只能选择 candidateArticles 中的 id'],
      clarifyingQuestions: ['最多 3 个需要用户补充的问题'],
      disclaimer: '这是风险分诊和养护引导，不是疾病确诊或用药建议。',
    }, null, 2),
    '',
    'context:',
    compactContext,
  ].join('\n');
  return { system, messages: [{ role: 'user', content: user }], temperature: 0.15, maxTokens: 900, thinking: 'disabled' };
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
  statusRestatement: typeof data?.statusRestatement === 'string' ? data.statusRestatement : undefined,
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

const normalizeRecommendationAssistData = (data) => ({
  structuredPreference: data?.structuredPreference && typeof data.structuredPreference === 'object'
    ? {
      experience: typeof data.structuredPreference.experience === 'string' ? data.structuredPreference.experience : undefined,
      maintenance: typeof data.structuredPreference.maintenance === 'string' ? data.structuredPreference.maintenance : undefined,
      visualStyle: Array.isArray(data.structuredPreference.visualStyle) ? data.structuredPreference.visualStyle.filter(item => typeof item === 'string').slice(0, 5) : [],
      keywords: Array.isArray(data.structuredPreference.keywords) ? data.structuredPreference.keywords.filter(item => typeof item === 'string').slice(0, 8) : [],
    }
    : {},
  ranking: Array.isArray(data?.ranking)
    ? data.ranking.slice(0, 8).map(item => ({
      speciesId: typeof item?.speciesId === 'string' ? item.speciesId : '',
      reason: typeof item?.reason === 'string' ? item.reason : '符合本地规则候选。',
    })).filter(item => item.speciesId)
    : [],
  explanations: Array.isArray(data?.explanations)
    ? data.explanations.filter(item => typeof item === 'string').slice(0, 5)
    : [],
  stagedPlan: Array.isArray(data?.stagedPlan)
    ? data.stagedPlan.filter(item => typeof item === 'string').slice(0, 5)
    : [],
  questions: Array.isArray(data?.questions)
    ? data.questions.filter(item => typeof item === 'string').slice(0, 3)
    : [],
});

const normalizeTankCopilotData = (data) => {
  const allowedActions = new Set(['complete_tank_info', 'view_safe_candidates', 'start_addition_simulation', 'restart_goal']);
  const allowedInformationKeys = new Set(['tank_size', 'water_type', 'temperature', 'filter', 'preference', 'other']);

  return {
    goalUnderstanding: typeof data?.goalUnderstanding === 'string' && data.goalUnderstanding.trim()
      ? data.goalUnderstanding.trim()
      : '我会先按本地规则检查鱼缸条件，再给出可执行建缸方案。',
    missingQuestions: Array.isArray(data?.missingQuestions)
      ? data.missingQuestions.slice(0, 3).map((item, index) => ({
        id: typeof item?.id === 'string' && item.id.trim() ? item.id.trim() : `question-${index + 1}`,
        prompt: typeof item?.prompt === 'string' ? item.prompt.trim() : '',
        informationKey: allowedInformationKeys.has(item?.informationKey) ? item.informationKey : 'other',
      })).filter(item => item.prompt)
      : [],
    planSummary: typeof data?.planSummary === 'string' ? data.planSummary.trim() : '',
    recommendedActions: Array.isArray(data?.recommendedActions)
      ? data.recommendedActions.slice(0, 2).map(item => ({
        type: allowedActions.has(item?.type) ? item.type : 'restart_goal',
        label: typeof item?.label === 'string' && item.label.trim() ? item.label.trim() : '重新描述目标',
      }))
      : [],
    selectedCandidateIds: Array.isArray(data?.selectedCandidateIds)
      ? data.selectedCandidateIds.filter(item => typeof item === 'string' && item.trim()).slice(0, 6)
      : [],
    blockedExplanation: Array.isArray(data?.blockedExplanation)
      ? data.blockedExplanation.filter(item => typeof item === 'string' && item.trim()).slice(0, 5)
      : [],
  };
};

const normalizeTankDailyCheckData = (data) => ({
  summary: typeof data?.summary === 'string' ? data.summary.trim() : '',
  priority: ['routine', 'watch', 'urgent'].includes(data?.priority) ? data.priority : 'watch',
  reasoning: Array.isArray(data?.reasoning) ? data.reasoning.filter(item => typeof item === 'string').slice(0, 5) : [],
  recommendedArticleIds: Array.isArray(data?.recommendedArticleIds)
    ? data.recommendedArticleIds.filter(item => typeof item === 'string').slice(0, 3)
    : [],
  clarifyingQuestions: Array.isArray(data?.clarifyingQuestions)
    ? data.clarifyingQuestions.filter(item => typeof item === 'string').slice(0, 3)
    : [],
  disclaimer: '这是风险分诊和养护引导，不是疾病确诊或用药建议。',
});

const fetchWithTimeout = async (url, options, timeoutMs = aiRequestTimeoutMs) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const aiFailureReasonFromError = (error) => {
  if (error?.name === 'AbortError') return 'timeout';
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('json') || message.includes('unexpected')) return 'invalid_json';
  if (message.includes('fetch') || message.includes('network') || message.includes('econn')) return 'network';
  return 'unknown';
};

app.post(['/api/ai/chat', '/api/v1/ai/chat'], async (req, res) => {
  const rateLimit = checkAiRateLimit(getClientId(req));
  if (!rateLimit.allowed) {
    return res
      .status(429)
      .set('Retry-After', String(rateLimit.retryAfterSeconds))
      .json({ error: `请求太频繁，请 ${rateLimit.retryAfterSeconds} 秒后再试。` });
  }

  const apiKey = pickConfiguredApiKey(process.env.AI_API_KEY, process.env.DEEPSEEK_API_KEY);
  if (!isConfiguredApiKey(apiKey)) {
    return res.status(503).json({ ok: false, error: 'AI provider is not configured', failureReason: 'not_configured' });
  }

  const { task, context } = req.body || {};
  const requestInput = task === 'risk_explanation'
    ? buildRiskExplanationPrompt(context)
    : task === 'risk_audit'
      ? buildRiskAuditPrompt(context)
      : task === 'recommendation_assist'
        ? buildRecommendationAssistPrompt(context)
        : task === 'build_tank_copilot'
          ? buildTankCopilotPrompt(context)
          : task === 'tank_daily_check_interpretation'
            ? buildTankDailyCheckPrompt(context)
          : req.body || {};

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
    const deepseekResponse = await fetchWithTimeout(`${aiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await deepseekResponse.text();
    if (!deepseekResponse.ok) {
      return res.status(502).json(task ? {
        ok: false,
        error: `AI 请求失败：${responseText.slice(0, 300)}`,
        failureReason: 'network',
      } : {
        error: `DeepSeek 请求失败：${responseText.slice(0, 300)}`,
        failureReason: 'network',
      });
    }

    const data = JSON.parse(responseText);
    const content = data.choices?.[0]?.message?.content || '';
    if (task === 'risk_explanation') {
      const parsed = parseJsonObject(content);
      return res.json({
        ok: true,
        task: 'risk_explanation',
        source: 'model',
        generatedAt: new Date().toISOString(),
        data: normalizeRiskExplanationData(parsed),
      });
    }
    if (task === 'risk_audit') {
      const parsed = parseJsonObject(content);
      return res.json({
        ok: true,
        task: 'risk_audit',
        source: 'model',
        generatedAt: new Date().toISOString(),
        data: normalizeRiskAuditData(parsed),
      });
    }
    if (task === 'recommendation_assist') {
      const parsed = parseJsonObject(content);
      return res.json({
        ok: true,
        task: 'recommendation_assist',
        source: 'model',
        generatedAt: new Date().toISOString(),
        data: normalizeRecommendationAssistData(parsed),
      });
    }
    if (task === 'build_tank_copilot') {
      const parsed = parseJsonObject(content);
      return res.json({
        ok: true,
        task: 'build_tank_copilot',
        source: 'model',
        generatedAt: new Date().toISOString(),
        data: normalizeTankCopilotData(parsed),
      });
    }
    if (task === 'tank_daily_check_interpretation') {
      const parsed = parseJsonObject(content);
      return res.json({
        ok: true,
        task: 'tank_daily_check_interpretation',
        source: 'model',
        generatedAt: new Date().toISOString(),
        data: normalizeTankDailyCheckData(parsed),
      });
    }

    res.json({
      content,
      model: data.model || aiModel,
      usage: data.usage,
    });
  } catch (error) {
    console.error('DeepSeek proxy error:', error);
    const failureReason = aiFailureReasonFromError(error);
    res.status(500).json(task ? {
      ok: false,
      error: error?.name === 'AbortError' ? 'AI request timed out' : 'AI request failed',
      failureReason,
    } : { ok: false, error: error?.name === 'AbortError' ? 'AI request timed out' : 'AI request failed', failureReason });
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

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isDirectRun) {
  app.listen(port, () => {
    console.log(`AquaGuide API server running at http://localhost:${port}`);
  });
}

export default app;
