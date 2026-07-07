export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AskAiOptions {
  messages: AiMessage[];
  system?: string;
  temperature?: number;
  maxTokens?: number;
  thinking?: 'enabled' | 'disabled';
}

export type AiTaskName = 'risk_explanation' | 'risk_audit' | 'recommendation_assist' | 'build_tank_copilot';
export type AiResponseSource = 'model' | 'fallback';
export type AiFailureReason = 'not_configured' | 'network' | 'timeout' | 'invalid_json' | 'status_mismatch' | 'unknown';

export interface AiResultMeta {
  source?: AiResponseSource;
  failureReason?: AiFailureReason;
  task?: AiTaskName;
  generatedAt?: string;
}

export interface RiskExplanationReason {
  title: string;
  detail: string;
  source: string;
}

export interface RiskExplanationSuggestion {
  title: string;
  detail: string;
}

export interface RiskExplanationData extends AiResultMeta {
  statusRestatement?: string;
  summary: string;
  reasons: RiskExplanationReason[];
  suggestions: RiskExplanationSuggestion[];
  nextSteps: string[];
  disclaimer: string;
  fallback?: boolean;
}

export interface RiskAuditMissingRisk {
  type: string;
  title: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  evidence: string;
}

export interface RiskAuditUncertainItem {
  title: string;
  reason: string;
}

export interface RiskAuditData extends AiResultMeta {
  hasAdditionalRisk: boolean;
  additionalRiskLevel: 'none' | 'low' | 'medium' | 'high';
  missingRisks: RiskAuditMissingRisk[];
  uncertainItems: RiskAuditUncertainItem[];
  userFacingSummary: string;
  suggestions: string[];
  fallback?: boolean;
}

export interface RecommendationAssistData extends AiResultMeta {
  structuredPreference: {
    experience?: string;
    maintenance?: string;
    visualStyle?: string[];
    keywords?: string[];
  };
  ranking: Array<{
    speciesId: string;
    reason: string;
  }>;
  explanations: string[];
  stagedPlan: string[];
  questions: string[];
  fallback?: boolean;
}

export type TankBuildNextActionType = 'complete_tank_info' | 'view_candidates' | 'simulate_plan' | 'none';

export interface TankBuildCopilotCandidate {
  speciesId?: string;
  name: string;
  status?: 'compatible' | 'caution' | 'insufficient_data';
  recommendedQuantity?: number;
  reason: string;
}

export interface TankBuildCopilotData extends AiResultMeta {
  reply: string;
  missingQuestions: string[];
  planSummary: string[];
  recommendedActions: string[];
  safeCandidates: TankBuildCopilotCandidate[];
  blockedReasons: string[];
  nextAction: {
    type: TankBuildNextActionType;
    label: string;
  };
  fallback?: boolean;
}

const fallbackRiskExplanation: RiskExplanationData = {
  statusRestatement: 'unknown',
  summary: '暂时无法生成 AI 分析',
  reasons: [{
    title: '请先参考系统规则结果',
    detail: '你仍然可以参考系统规则结果：当前风险主要来自水体、空间、水质、温度或已有生物冲突。建议先查看本地风险原因，再决定是否加入。',
    source: '来自本地规则',
  }],
  suggestions: [{
    title: '优先处理本地风险项',
    detail: '先按照弹窗里的容量、水质、混养或信息不足提示逐项调整，再重新查看风险。',
  }],
  nextSteps: ['查看本地风险原因', '调整鱼缸或生物组合', '调整后再次检查'],
  disclaimer: '最终判断以系统规则结果为准',
  fallback: true,
};

const fallbackRiskAudit: RiskAuditData = {
  hasAdditionalRisk: false,
  additionalRiskLevel: 'none',
  missingRisks: [],
  uncertainItems: [{
    title: 'AI 解读暂不可用',
    reason: '当前结果以系统规则为准，AI 失败不会影响本地适配判断。',
  }],
  userFacingSummary: 'AI 解读暂不可用，当前结果以系统规则为准。',
  suggestions: [],
  fallback: true,
};

const fallbackRecommendationAssist: RecommendationAssistData = {
  structuredPreference: {},
  ranking: [],
  explanations: ['AI 辅助暂不可用，当前推荐已按本地规则排序。'],
  stagedPlan: ['先选择 1 个候选进入模拟', '确认负载和风险后再少量加入', '加入后观察 3-7 天'],
  questions: [],
  fallback: true,
};

const fallbackTankBuildCopilot: TankBuildCopilotData = {
  reply: 'AI 暂不可用，但可以继续使用本地规则生成基础方案。',
  missingQuestions: [],
  planSummary: ['先补齐鱼缸尺寸、水温、过滤和加热信息。'],
  recommendedActions: ['完善鱼缸信息后，再查看本地规则筛选出的候选生物。'],
  safeCandidates: [],
  blockedReasons: [],
  nextAction: {
    type: 'complete_tank_info',
    label: '完善鱼缸信息',
  },
  fallback: true,
};

export const getAiUnavailableMessage = () => (
  'AI 后端还没有配置 API Key。请在项目根目录创建 .env.local，并写入 AI_API_KEY=你的Key，然后重启 npm run dev。'
);

const withAiMeta = <T extends { fallback?: boolean }>(
  data: T,
  task: AiTaskName,
  source: AiResponseSource,
  failureReason?: AiFailureReason,
): T & Required<Pick<AiResultMeta, 'source' | 'task' | 'generatedAt'>> & Pick<AiResultMeta, 'failureReason'> => ({
  ...data,
  source,
  failureReason,
  task,
  generatedAt: new Date().toISOString(),
  fallback: source === 'fallback',
});

const failureReasonFromResponse = (response: Response, payload: { error?: unknown } = {}): AiFailureReason => {
  const message = typeof payload.error === 'string' ? payload.error.toLowerCase() : '';
  if (response.status === 503 || message.includes('not configured') || message.includes('api key')) return 'not_configured';
  if (response.status === 504 || message.includes('timeout') || message.includes('timed out')) return 'timeout';
  if (message.includes('json')) return 'invalid_json';
  if (response.status === 502) return 'network';
  return 'unknown';
};

const failureReasonFromError = (error: unknown): AiFailureReason => {
  if (error && typeof error === 'object' && 'name' in error && (error as { name?: unknown }).name === 'AbortError') return 'timeout';
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('json')) return 'invalid_json';
  if (message.includes('failed to fetch') || message.includes('network')) return 'network';
  return 'unknown';
};

export const askAquaGuideAI = async ({
  messages,
  system,
  temperature = 0.4,
  maxTokens = 1200,
  thinking = 'disabled',
}: AskAiOptions) => {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, system, temperature, maxTokens, thinking }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || getAiUnavailableMessage());
  }

  return String(data.content || '');
};

const normalizeRiskExplanation = (data: Partial<RiskExplanationData> | undefined): RiskExplanationData => ({
  statusRestatement: typeof data?.statusRestatement === 'string' ? data.statusRestatement : undefined,
  summary: typeof data?.summary === 'string' && data.summary.trim() ? data.summary : fallbackRiskExplanation.summary,
  reasons: Array.isArray(data?.reasons) ? data.reasons.map(item => ({
    title: typeof item?.title === 'string' ? item.title : '风险原因',
    detail: typeof item?.detail === 'string' ? item.detail : '信息不足。',
    source: typeof item?.source === 'string' ? item.source : '来自本地规则',
  })) : fallbackRiskExplanation.reasons,
  suggestions: Array.isArray(data?.suggestions) ? data.suggestions.map(item => ({
    title: typeof item?.title === 'string' ? item.title : '调整建议',
    detail: typeof item?.detail === 'string' ? item.detail : '先参考系统规则结果逐项调整。',
  })) : fallbackRiskExplanation.suggestions,
  nextSteps: Array.isArray(data?.nextSteps) ? data.nextSteps.filter(step => typeof step === 'string') : fallbackRiskExplanation.nextSteps,
  disclaimer: '最终判断以系统规则结果为准',
});

const getExpectedRiskExplanationStatus = (context: unknown) => {
  if (!context || typeof context !== 'object') return '';
  const value = (context as {
    finalStatus?: unknown;
    riskResult?: { status?: unknown };
    ruleResult?: { status?: unknown };
  }).finalStatus
    ?? (context as { riskResult?: { status?: unknown } }).riskResult?.status
    ?? (context as { ruleResult?: { status?: unknown } }).ruleResult?.status;
  return typeof value === 'string' ? value : '';
};

const normalizeRiskAudit = (data: Partial<RiskAuditData> | undefined): RiskAuditData => {
  const level = ['none', 'low', 'medium', 'high'].includes(String(data?.additionalRiskLevel))
    ? data?.additionalRiskLevel as RiskAuditData['additionalRiskLevel']
    : 'none';

  return {
    hasAdditionalRisk: Boolean(data?.hasAdditionalRisk),
    additionalRiskLevel: level,
    missingRisks: Array.isArray(data?.missingRisks) ? data.missingRisks.map(item => ({
      type: typeof item?.type === 'string' ? item.type : 'unknown',
      title: typeof item?.title === 'string' ? item.title : '需要补充确认',
      reason: typeof item?.reason === 'string' ? item.reason : '信息不足，无法完整判断。',
      severity: ['low', 'medium', 'high'].includes(String(item?.severity)) ? item.severity : 'low',
      evidence: typeof item?.evidence === 'string' ? item.evidence : '来自输入信息',
    })).slice(0, 5) : [],
    uncertainItems: Array.isArray(data?.uncertainItems) ? data.uncertainItems.map(item => ({
      title: typeof item?.title === 'string' ? item.title : '信息不足',
      reason: typeof item?.reason === 'string' ? item.reason : '需要补充数据后再确认。',
    })).slice(0, 5) : [],
    userFacingSummary: typeof data?.userFacingSummary === 'string' && data.userFacingSummary.trim()
      ? data.userFacingSummary
      : 'AI 未发现额外明显风险。',
    suggestions: Array.isArray(data?.suggestions)
      ? data.suggestions.filter(item => typeof item === 'string').slice(0, 5)
      : [],
  };
};

const normalizeRecommendationAssist = (data: Partial<RecommendationAssistData> | undefined): RecommendationAssistData => ({
  structuredPreference: typeof data?.structuredPreference === 'object' && data.structuredPreference
    ? {
      experience: typeof data.structuredPreference.experience === 'string' ? data.structuredPreference.experience : undefined,
      maintenance: typeof data.structuredPreference.maintenance === 'string' ? data.structuredPreference.maintenance : undefined,
      visualStyle: Array.isArray(data.structuredPreference.visualStyle) ? data.structuredPreference.visualStyle.filter(item => typeof item === 'string') : [],
      keywords: Array.isArray(data.structuredPreference.keywords) ? data.structuredPreference.keywords.filter(item => typeof item === 'string') : [],
    }
    : {},
  ranking: Array.isArray(data?.ranking) ? data.ranking.map(item => ({
    speciesId: typeof item?.speciesId === 'string' ? item.speciesId : '',
    reason: typeof item?.reason === 'string' ? item.reason : '本地规则候选。',
  })).filter(item => item.speciesId).slice(0, 8) : [],
  explanations: Array.isArray(data?.explanations)
    ? data.explanations.filter(item => typeof item === 'string').slice(0, 5)
    : fallbackRecommendationAssist.explanations,
  stagedPlan: Array.isArray(data?.stagedPlan)
    ? data.stagedPlan.filter(item => typeof item === 'string').slice(0, 5)
    : fallbackRecommendationAssist.stagedPlan,
  questions: Array.isArray(data?.questions)
    ? data.questions.filter(item => typeof item === 'string').slice(0, 3)
    : [],
});

const normalizeTankBuildCopilot = (data: Partial<TankBuildCopilotData> | undefined): TankBuildCopilotData => {
  const allowedActions: TankBuildNextActionType[] = ['complete_tank_info', 'view_candidates', 'simulate_plan', 'none'];
  const rawActionType = data?.nextAction?.type;
  const actionType = allowedActions.includes(rawActionType as TankBuildNextActionType)
    ? rawActionType as TankBuildNextActionType
    : 'none';

  return {
    reply: typeof data?.reply === 'string' && data.reply.trim() ? data.reply : fallbackTankBuildCopilot.reply,
    missingQuestions: Array.isArray(data?.missingQuestions)
      ? data.missingQuestions.filter(item => typeof item === 'string').slice(0, 3)
      : [],
    planSummary: Array.isArray(data?.planSummary)
      ? data.planSummary.filter(item => typeof item === 'string').slice(0, 5)
      : fallbackTankBuildCopilot.planSummary,
    recommendedActions: Array.isArray(data?.recommendedActions)
      ? data.recommendedActions.filter(item => typeof item === 'string').slice(0, 5)
      : fallbackTankBuildCopilot.recommendedActions,
    safeCandidates: Array.isArray(data?.safeCandidates)
      ? data.safeCandidates.map(item => ({
        speciesId: typeof item?.speciesId === 'string' ? item.speciesId : undefined,
        name: typeof item?.name === 'string' ? item.name : '候选生物',
        status: ['compatible', 'caution', 'insufficient_data'].includes(String(item?.status))
          ? item.status
          : 'compatible',
        recommendedQuantity: Number.isFinite(Number(item?.recommendedQuantity)) ? Math.max(1, Number(item.recommendedQuantity)) : undefined,
        reason: typeof item?.reason === 'string' ? item.reason : '符合本地规则候选。',
      })).slice(0, 6)
      : [],
    blockedReasons: Array.isArray(data?.blockedReasons)
      ? data.blockedReasons.filter(item => typeof item === 'string').slice(0, 5)
      : [],
    nextAction: {
      type: actionType,
      label: typeof data?.nextAction?.label === 'string' && data.nextAction.label.trim()
        ? data.nextAction.label
        : actionType === 'complete_tank_info'
          ? '完善鱼缸信息'
          : actionType === 'view_candidates'
            ? '查看候选生物'
            : actionType === 'simulate_plan'
              ? '加入模拟鱼缸'
              : '我知道了',
    },
  };
};

export const generateRiskExplanation = async (context: unknown): Promise<RiskExplanationData> => {
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'risk_explanation',
        context,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) {
      return withAiMeta({
        ...fallbackRiskExplanation,
        summary: '暂时无法生成 AI 分析',
        reasons: fallbackRiskExplanation.reasons,
      }, 'risk_explanation', 'fallback', failureReasonFromResponse(response, payload));
    }

    if (payload?.task !== 'risk_explanation') {
      return withAiMeta(fallbackRiskExplanation, 'risk_explanation', 'fallback', 'invalid_json');
    }

    const normalized = normalizeRiskExplanation(payload.data);
    const expectedStatus = getExpectedRiskExplanationStatus(context);
    if (expectedStatus && normalized.statusRestatement && normalized.statusRestatement !== expectedStatus) {
      return withAiMeta({
        ...fallbackRiskExplanation,
        summary: 'AI 解读与系统结论不一致，已改用本地说明。',
      }, 'risk_explanation', 'fallback', 'status_mismatch');
    }
    return withAiMeta(normalized, 'risk_explanation', 'model');
  } catch (error) {
    return withAiMeta(fallbackRiskExplanation, 'risk_explanation', 'fallback', failureReasonFromError(error));
  }
};

export const generateRiskAudit = async (context: unknown): Promise<RiskAuditData> => {
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'risk_audit',
        context,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) {
      return withAiMeta(fallbackRiskAudit, 'risk_audit', 'fallback', failureReasonFromResponse(response, payload));
    }

    if (payload?.task !== 'risk_audit') {
      return withAiMeta(fallbackRiskAudit, 'risk_audit', 'fallback', 'invalid_json');
    }

    return withAiMeta(normalizeRiskAudit(payload.data), 'risk_audit', 'model');
  } catch (error) {
    return withAiMeta(fallbackRiskAudit, 'risk_audit', 'fallback', failureReasonFromError(error));
  }
};

export const generateRecommendationAssist = async (context: unknown): Promise<RecommendationAssistData> => {
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'recommendation_assist',
        context,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) {
      return withAiMeta(fallbackRecommendationAssist, 'recommendation_assist', 'fallback', failureReasonFromResponse(response, payload));
    }

    if (payload?.task !== 'recommendation_assist') {
      return withAiMeta(fallbackRecommendationAssist, 'recommendation_assist', 'fallback', 'invalid_json');
    }

    return withAiMeta(normalizeRecommendationAssist(payload.data), 'recommendation_assist', 'model');
  } catch (error) {
    return withAiMeta(fallbackRecommendationAssist, 'recommendation_assist', 'fallback', failureReasonFromError(error));
  }
};

export const generateTankBuildCopilot = async (context: unknown): Promise<TankBuildCopilotData> => {
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'build_tank_copilot',
        context,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) {
      return withAiMeta(fallbackTankBuildCopilot, 'build_tank_copilot', 'fallback', failureReasonFromResponse(response, payload));
    }

    if (payload?.task !== 'build_tank_copilot') {
      return withAiMeta(fallbackTankBuildCopilot, 'build_tank_copilot', 'fallback', 'invalid_json');
    }

    return withAiMeta(normalizeTankBuildCopilot(payload.data), 'build_tank_copilot', 'model');
  } catch (error) {
    return withAiMeta(fallbackTankBuildCopilot, 'build_tank_copilot', 'fallback', failureReasonFromError(error));
  }
};
