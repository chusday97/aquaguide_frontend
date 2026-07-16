import { supabase } from '../../lib/supabaseClient';

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VERSION_CONFLICT'
  | 'DUPLICATE_RESOURCE'
  | 'PAYLOAD_TOO_LARGE'
  | 'MIGRATION_REJECTED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'DEPENDENCY_UNAVAILABLE';

export class AquaGuideApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly requestId?: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

type ApiEnvelope<T> = { data: T; requestId: string };
type ApiFailureEnvelope = {
  error?: { code?: ApiErrorCode; message?: string; details?: unknown };
  requestId?: string;
};

export const getApiAccessToken = async () => {
  if (!supabase) throw new AquaGuideApiError(503, 'DEPENDENCY_UNAVAILABLE', '登录服务尚未配置。');
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new AquaGuideApiError(503, 'DEPENDENCY_UNAVAILABLE', '暂时无法读取登录状态。');
  if (!data.session?.access_token) throw new AquaGuideApiError(401, 'AUTH_REQUIRED', '请先登录。');
  return data.session.access_token;
};

export type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  authenticated?: boolean;
  idempotencyKey?: string;
};

export const apiRequest = async <T>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  if (options.idempotencyKey) headers.set('Idempotency-Key', options.idempotencyKey);
  if (options.authenticated !== false) headers.set('Authorization', `Bearer ${await getApiAccessToken()}`);

  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...options,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new AquaGuideApiError(0, 'DEPENDENCY_UNAVAILABLE', '网络连接失败，请检查网络后重试。');
  }

  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | ApiFailureEnvelope | null;
  if (!response.ok) {
    const failure = payload as ApiFailureEnvelope | null;
    throw new AquaGuideApiError(
      response.status,
      failure?.error?.code || 'INTERNAL_ERROR',
      failure?.error?.message || '请求没有完成，请稍后重试。',
      failure?.requestId,
      failure?.error?.details,
    );
  }
  if (!payload || !('data' in payload)) {
    throw new AquaGuideApiError(response.status, 'INTERNAL_ERROR', '服务返回的数据格式无效。');
  }
  return payload.data;
};

export const createIdempotencyKey = (scope: string) => {
  const random = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${scope}:${random}`;
};
