import type {
  SpeciesDiagnosisStepInput,
  SpeciesDiagnosisStepOutput,
  SpeciesRecognitionResult,
} from '../../../packages/contracts/src/index';
import { apiRequest, AquaGuideApiError } from '../api/api-client';

type RecognitionResponse = SpeciesRecognitionResult & { modelName?: string };

const readApiPayload = async <T,>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => null) as {
    data?: T;
    error?: { code?: string; message?: string; details?: unknown };
    requestId?: string;
  } | null;
  if (!response.ok || !payload?.data) {
    throw new AquaGuideApiError(
      response.status,
      (payload?.error?.code as AquaGuideApiError['code']) || 'INTERNAL_ERROR',
      payload?.error?.message || '请求没有完成，请稍后重试。',
      payload?.requestId,
      payload?.error?.details,
    );
  }
  return payload.data;
};

export const recognizeSpeciesImage = async (
  file: File,
  locale: 'zh-CN' | 'en',
  signal?: AbortSignal,
) => {
  let response: Response;
  try {
    response = await fetch('/api/v1/ai/species-recognition', {
      method: 'POST',
      headers: {
        'Content-Type': file.type,
        'X-AquaGuide-Locale': locale,
      },
      body: file,
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new AquaGuideApiError(0, 'DEPENDENCY_UNAVAILABLE', '图片识别服务暂时无法连接。');
  }
  return readApiPayload<RecognitionResponse>(response);
};

export const registerRecognitionMiss = (input: {
  imageFingerprint: string;
  modelName: string;
  modelVersion?: string;
  candidateLabels: string[];
  candidateCatalogKeys: string[];
}) => apiRequest<{ persisted: boolean; missId?: string; storage?: 'session'; message?: string }>(
  '/ai/species-recognition/misses',
  { method: 'POST', body: input, authenticated: false },
);

export const resolveRecognitionMiss = (missId: string, resolvedCatalogKey: string) => (
  apiRequest<{ persisted: boolean; missId?: string; storage?: 'session'; message?: string }>(
    `/ai/species-recognition/misses/${encodeURIComponent(missId)}/resolve`,
    { method: 'PATCH', body: { resolvedCatalogKey }, authenticated: false },
  )
);

export const getSpeciesDiagnosisStep = (input: SpeciesDiagnosisStepInput, signal?: AbortSignal) => (
  apiRequest<SpeciesDiagnosisStepOutput>('/ai/species-diagnosis/step', {
    method: 'POST',
    body: input,
    authenticated: false,
    signal,
  })
);
