import { apiConfig } from '../config';

export type ProviderFailureReason = 'not_configured' | 'timeout' | 'network' | 'invalid_response';

export class ProviderError extends Error {
  constructor(public readonly reason: ProviderFailureReason, message: string) {
    super(message);
  }
}

const cleanJsonText = (value: string) => value
  .trim()
  .replace(/^```(?:json)?\s*/i, '')
  .replace(/\s*```$/, '');

const fetchJsonResponse = async (
  baseUrl: string,
  apiKey: string,
  model: string,
  timeoutMs: number,
  body: Record<string, unknown>,
) => {
  if (!apiKey || !baseUrl || !model) throw new ProviderError('not_configured', 'AI provider is not configured.');
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, ...body }),
        signal: controller.signal,
      });
      if (!response.ok) {
        if (attempt === 0 && response.status >= 500) continue;
        throw new ProviderError('network', `Provider returned HTTP ${response.status}.`);
      }
      const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
      const content = payload.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) throw new ProviderError('invalid_response', 'Provider response did not contain text.');
      try {
        return JSON.parse(cleanJsonText(content)) as unknown;
      } catch {
        throw new ProviderError('invalid_response', 'Provider response was not valid JSON.');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new ProviderError('timeout', 'Provider request timed out.');
      } else if (error instanceof ProviderError) {
        lastError = error;
      } else {
        lastError = new ProviderError('network', 'Provider request failed.');
      }
      if (attempt === 1) throw lastError;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError instanceof Error ? lastError : new ProviderError('network', 'Provider request failed.');
};

export const requestVisionCandidates = (imageDataUrl: string, locale: 'zh-CN' | 'en') => fetchJsonResponse(
  apiConfig.visionBaseUrl,
  apiConfig.visionApiKey,
  apiConfig.visionModel,
  apiConfig.visionTimeoutMs,
  {
    temperature: 0.1,
    max_tokens: 700,
    response_format: { type: 'json_object' },
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: locale === 'en'
            ? 'Identify aquarium species visible in this image. Return JSON only: {"candidates":[{"commonName":"","scientificName":"","confidenceBand":"high|medium|low","visualEvidence":[""]}]}. Return at most 3 candidates. Use low confidence for blurry, multiple-subject, or non-aquarium images. Do not diagnose health.'
            : '识别图片中的水族生物。只返回 JSON：{"candidates":[{"commonName":"","scientificName":"","confidenceBand":"high|medium|low","visualEvidence":[""]}]}。最多 3 个候选；模糊、多主体或非水族图片必须使用低置信度，不判断健康或疾病。',
        },
        { type: 'image_url', image_url: { url: imageDataUrl } },
      ],
    }],
  },
);

export const requestSymptomObservations = (context: Record<string, unknown>) => fetchJsonResponse(
  apiConfig.aiBaseUrl,
  apiConfig.aiApiKey,
  apiConfig.aiModel,
  apiConfig.aiTimeoutMs,
  {
    temperature: 0,
    max_tokens: 500,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: [
          'You extract aquarium observations into controlled codes. You do not diagnose, rank causes, set urgency, recommend medicine, or invent observations.',
          'Allowed codes: scope, breathing, posture, recent_change, external_signs, activity, feeding.',
          'Return JSON only: {"observations":[{"code":"","value":"","evidence":""}]}.',
        ].join(' '),
      },
      { role: 'user', content: JSON.stringify(context).slice(0, 7000) },
    ],
  },
);
