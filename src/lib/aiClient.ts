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

import type { TankDailyCheckContext, TankDailyCheckInterpretation } from '../modules/diagnosis/diagnosis.types';

export type AiTaskName = 'risk_explanation' | 'risk_audit' | 'recommendation_assist' | 'build_tank_copilot' | 'tank_daily_check_interpretation';
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

export type TankBuildCopilotData = TankCopilotResponse;
export type TankDailyCheckInterpretationData = TankDailyCheckInterpretation & AiResultMeta & { fallback?: boolean };

const fallbackRiskExplanation: RiskExplanationData = {
  statusRestatement: 'unknown',
  summary: 'AI 暂不可用，系统规则仍可使用。',
  reasons: [{
    title: '本地模板说明',
    detail: '当前只展示本地规则结果，AI 没有参与判断或改写结论。',
    source: '本地模板',
  }],
  suggestions: [{
    title: '查看系统规则',
    detail: '先处理页面中的阻断、风险或缺失信息，再重新评估。',
  }],
  nextSteps: ['查看系统规则依据', '处理风险或缺失信息', '调整后再次检查'],
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

const dailyPriorityRank: Record<TankDailyCheckInterpretation['priority'], number> = {
  routine: 1,
  watch: 2,
  urgent: 3,
};

const getDeterministicDailyPriority = (context: TankDailyCheckContext): TankDailyCheckInterpretation['priority'] => (
  context.deterministicResult.riskLevel === 'high'
    ? 'urgent'
    : context.deterministicResult.riskLevel === 'medium' || context.deterministicResult.riskLevel === 'unknown'
      ? 'watch'
      : 'routine'
);

const buildDailyCheckFallback = (context: TankDailyCheckContext): TankDailyCheckInterpretation => ({
  summary: context.deterministicResult.summary,
  priority: getDeterministicDailyPriority(context),
  reasoning: [...context.deterministicResult.possibleCauses, ...context.deterministicResult.evidence].slice(0, 4),
  recommendedArticleIds: context.candidateArticles.slice(0, 2).map(article => article.id),
  clarifyingQuestions: context.deterministicResult.missingInfo.slice(0, 3).map(item => `请补充：${item}`),
  disclaimer: '这是风险分诊和养护引导，不是疾病确诊或用药建议。',
});

export const sanitizeTankDailyCheckInterpretation = (
  data: Partial<TankDailyCheckInterpretation> | undefined,
  context: TankDailyCheckContext,
): TankDailyCheckInterpretation => {
  const fallback = buildDailyCheckFallback(context);
  const allowedPriorities: TankDailyCheckInterpretation['priority'][] = ['routine', 'watch', 'urgent'];
  const requestedPriority = allowedPriorities.includes(data?.priority as TankDailyCheckInterpretation['priority'])
    ? data?.priority as TankDailyCheckInterpretation['priority']
    : fallback.priority;
  const priority = dailyPriorityRank[requestedPriority] < dailyPriorityRank[fallback.priority]
    ? fallback.priority
    : requestedPriority;
  const candidateIds = new Set(context.candidateArticles.map(article => article.id));

  return {
    summary: typeof data?.summary === 'string' && data.summary.trim() ? data.summary.trim() : fallback.summary,
    priority,
    reasoning: Array.isArray(data?.reasoning)
      ? data.reasoning.filter(item => typeof item === 'string' && item.trim()).slice(0, 5)
      : fallback.reasoning,
    recommendedArticleIds: Array.isArray(data?.recommendedArticleIds)
      ? Array.from(new Set(data.recommendedArticleIds.filter(id => typeof id === 'string' && candidateIds.has(id)))).slice(0, 3)
      : fallback.recommendedArticleIds,
    clarifyingQuestions: Array.isArray(data?.clarifyingQuestions)
      ? data.clarifyingQuestions.filter(item => typeof item === 'string' && item.trim()).slice(0, 3)
      : fallback.clarifyingQuestions,
    disclaimer: '这是风险分诊和养护引导，不是疾病确诊或用药建议。',
  };
};

export const getAiUnavailableMessage = () => (
  'AI 后端还没有配置 API Key。请在项目根目录创建 .env.local，并写入 AI_API_KEY=你的Key，然后重启 npm run dev。'
);

const withAiMeta = <T extends object, K extends AiTaskName>(
  data: T,
  task: K,
  source: AiResponseSource,
  failureReason?: AiFailureReason,
): T & { source: AiResponseSource; task: K; generatedAt: string; failureReason?: AiFailureReason; fallback?: boolean } => ({
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

const normalizeCopilotQuestion = (item: unknown, index: number): CopilotQuestion | null => {
  if (typeof item === 'string' && item.trim()) {
    return { id: `question-${index + 1}`, prompt: item.trim(), informationKey: 'other' };
  }
  if (!item || typeof item !== 'object') return null;
  const question = item as Partial<CopilotQuestion>;
  if (typeof question.prompt !== 'string' || !question.prompt.trim()) return null;
  const allowedKeys: CopilotQuestion['informationKey'][] = ['tank_size', 'water_type', 'temperature', 'filter', 'preference', 'other'];
  return {
    id: typeof question.id === 'string' && question.id.trim() ? question.id.trim() : `question-${index + 1}`,
    prompt: question.prompt.trim(),
    informationKey: allowedKeys.includes(question.informationKey as CopilotQuestion['informationKey'])
      ? question.informationKey as CopilotQuestion['informationKey']
      : 'other',
  };
};

const normalizeTankBuildCopilot = (
  data: Record<string, unknown> | undefined,
  context: TankCopilotContext,
): CopilotResponseCore => {
  const fallback = buildLocalTankCopilotFallback(context);
  const allowedActions: TankCopilotActionType[] = ['complete_tank_info', 'view_safe_candidates', 'start_addition_simulation', 'restart_goal'];
  const rawActions = Array.isArray(data?.recommendedActions) ? data.recommendedActions : [];
  const recommendedActions = rawActions.map((item): TankCopilotAction | null => {
    if (!item || typeof item !== 'object') return null;
    const action = item as Partial<TankCopilotAction>;
    if (!allowedActions.includes(action.type as TankCopilotActionType)) return null;
    return {
      type: action.type as TankCopilotActionType,
      label: typeof action.label === 'string' && action.label.trim() ? action.label.trim() : '继续',
    };
  }).filter((item): item is TankCopilotAction => Boolean(item)).slice(0, 2);

  return sanitizeTankCopilotResponse({
    goalUnderstanding: typeof data?.goalUnderstanding === 'string' && data.goalUnderstanding.trim()
      ? data.goalUnderstanding.trim()
      : fallback.goalUnderstanding,
    missingQuestions: Array.isArray(data?.missingQuestions)
      ? data.missingQuestions.map(normalizeCopilotQuestion).filter((item): item is CopilotQuestion => Boolean(item)).slice(0, 3)
      : [],
    planSummary: typeof data?.planSummary === 'string' && data.planSummary.trim()
      ? data.planSummary.trim()
      : fallback.planSummary,
    recommendedActions: recommendedActions.length > 0 ? recommendedActions : fallback.recommendedActions,
    selectedCandidateIds: Array.isArray(data?.selectedCandidateIds)
      ? data.selectedCandidateIds.filter(item => typeof item === 'string' && item.trim()).slice(0, 6) as string[]
      : [],
    blockedExplanation: Array.isArray(data?.blockedExplanation)
      ? data.blockedExplanation.filter(item => typeof item === 'string' && item.trim()).slice(0, 5) as string[]
      : [],
  }, context);
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
        summary: 'AI 暂不可用，系统规则仍可使用。',
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

export const generateTankBuildCopilot = async (context: TankCopilotContext): Promise<TankBuildCopilotData> => {
  const fallback = buildLocalTankCopilotFallback(context);
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
      return withAiMeta(fallback, 'build_tank_copilot', 'fallback', failureReasonFromResponse(response, payload));
    }

    if (payload?.task !== 'build_tank_copilot') {
      return withAiMeta(fallback, 'build_tank_copilot', 'fallback', 'invalid_json');
    }

    return withAiMeta(normalizeTankBuildCopilot(payload.data, context), 'build_tank_copilot', 'model');
  } catch (error) {
    return withAiMeta(fallback, 'build_tank_copilot', 'fallback', failureReasonFromError(error));
  }
};

export const generateTankDailyCheckInterpretation = async (
  context: TankDailyCheckContext,
): Promise<TankDailyCheckInterpretationData> => {
  const fallback = buildDailyCheckFallback(context);
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'tank_daily_check_interpretation', context }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) {
      return withAiMeta(fallback, 'tank_daily_check_interpretation', 'fallback', failureReasonFromResponse(response, payload));
    }
    if (payload?.task !== 'tank_daily_check_interpretation') {
      return withAiMeta(fallback, 'tank_daily_check_interpretation', 'fallback', 'invalid_json');
    }
    return withAiMeta(
      sanitizeTankDailyCheckInterpretation(payload.data, context),
      'tank_daily_check_interpretation',
      'model',
    );
  } catch (error) {
    return withAiMeta(fallback, 'tank_daily_check_interpretation', 'fallback', failureReasonFromError(error));
  }
};
import type {
  CopilotQuestion,
  TankCopilotAction,
  TankCopilotActionType,
  TankCopilotContext,
  TankCopilotResponse,
} from '../modules/copilot/copilot.types';
import {
  buildLocalTankCopilotFallback,
  sanitizeTankCopilotResponse,
  type CopilotResponseCore,
} from '../modules/copilot/copilot.policy';
