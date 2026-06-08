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

export interface RiskExplanationReason {
  title: string;
  detail: string;
  source: string;
}

export interface RiskExplanationSuggestion {
  title: string;
  detail: string;
}

export interface RiskExplanationData {
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

export interface RiskAuditData {
  hasAdditionalRisk: boolean;
  additionalRiskLevel: 'none' | 'low' | 'medium' | 'high';
  missingRisks: RiskAuditMissingRisk[];
  uncertainItems: RiskAuditUncertainItem[];
  userFacingSummary: string;
  suggestions: string[];
  fallback?: boolean;
}

const fallbackRiskExplanation: RiskExplanationData = {
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
    title: 'AI 补充检查暂不可用',
    reason: '当前结果以系统规则为准，AI 失败不会影响本地适配判断。',
  }],
  userFacingSummary: 'AI 补充检查暂不可用，当前结果以系统规则为准。',
  suggestions: [],
  fallback: true,
};

export const getAiUnavailableMessage = () => (
  'AI 后端还没有配置 API Key。请在项目根目录创建 .env.local，并写入 AI_API_KEY=你的Key，然后重启 npm run dev。'
);

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
      return {
        ...fallbackRiskExplanation,
        summary: '暂时无法生成 AI 分析',
        reasons: fallbackRiskExplanation.reasons,
      };
    }

    if (payload?.task !== 'risk_explanation') {
      return fallbackRiskExplanation;
    }

    return normalizeRiskExplanation(payload.data);
  } catch {
    return fallbackRiskExplanation;
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
      return fallbackRiskAudit;
    }

    if (payload?.task !== 'risk_audit') {
      return fallbackRiskAudit;
    }

    return normalizeRiskAudit(payload.data);
  } catch {
    return fallbackRiskAudit;
  }
};
