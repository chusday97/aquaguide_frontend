import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthenticatedRequest } from './auth';
import { ApiError, type ApiRequest } from './http';
import { getUserSupabase } from './supabase';

type UnknownRecord = Record<string, unknown>;

const camelKey = (key: string) => key.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());
const snakeKey = (key: string) => key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

export const camelize = <T = unknown>(value: unknown): T => {
  if (Array.isArray(value)) return value.map(item => camelize(item)) as T;
  if (!value || typeof value !== 'object' || value instanceof Date) return value as T;
  return Object.fromEntries(
    Object.entries(value as UnknownRecord).map(([key, child]) => [camelKey(key), camelize(child)]),
  ) as T;
};

export const snakeize = <T = UnknownRecord>(value: UnknownRecord): T => Object.fromEntries(
  Object.entries(value)
    .filter(([, child]) => child !== undefined)
    .map(([key, child]) => [snakeKey(key), child]),
) as T;

export const authenticatedRequest = (request: ApiRequest) => request as AuthenticatedRequest;

export const userClientFor = (request: ApiRequest) => {
  const authenticated = authenticatedRequest(request);
  if (!authenticated.accessToken || !authenticated.authUser) {
    throw new ApiError(401, 'AUTH_REQUIRED', '请先登录。');
  }
  return getUserSupabase(authenticated.accessToken);
};

export const requireIdempotencyKey = (request: ApiRequest) => {
  const key = request.header('idempotency-key')?.trim();
  if (!key || key.length > 180) {
    throw new ApiError(400, 'VALIDATION_ERROR', '写操作需要有效的 Idempotency-Key。');
  }
  return key;
};

const requestHash = (request: ApiRequest) => createHash('sha256')
  .update(JSON.stringify({ method: request.method, path: request.baseUrl + request.path, body: request.body || null }))
  .digest('hex');

export const deterministicUuid = (source: string) => {
  const hex = createHash('sha256').update(source).digest('hex').slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = ['8', '9', 'a', 'b'][Number.parseInt(hex[16], 16) % 4];
  return `${hex.slice(0, 8).join('')}-${hex.slice(8, 12).join('')}-${hex.slice(12, 16).join('')}-${hex.slice(16, 20).join('')}-${hex.slice(20, 32).join('')}`;
};

export type IdempotencyState = {
  key: string;
  hash: string;
  replay?: { resourceType?: string; resourceId?: string; responseStatus: number };
};

export const beginIdempotentWrite = async (request: ApiRequest): Promise<IdempotencyState> => {
  const key = requireIdempotencyKey(request);
  const hash = requestHash(request);
  const client = userClientFor(request);
  const userId = authenticatedRequest(request).authUser.id;
  const { data, error } = await client
    .from('idempotency_records')
    .select('request_hash,resource_type,resource_id,response_status')
    .eq('owner_id', userId)
    .eq('idempotency_key', key)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', '暂时无法确认写入状态。');
  if (!data) return { key, hash };
  if (data.request_hash !== hash) {
    throw new ApiError(409, 'DUPLICATE_RESOURCE', '这个幂等键已经用于另一项操作。');
  }
  return {
    key,
    hash,
    replay: {
      resourceType: data.resource_type || undefined,
      resourceId: data.resource_id || undefined,
      responseStatus: data.response_status,
    },
  };
};

export const finishIdempotentWrite = async (
  request: ApiRequest,
  state: IdempotencyState,
  resourceType: string,
  resourceId: string,
  responseStatus: number,
) => {
  const client = userClientFor(request);
  const userId = authenticatedRequest(request).authUser.id;
  const { error } = await client.from('idempotency_records').insert({
    id: deterministicUuid(`${userId}:idempotency:${state.key}`),
    owner_id: userId,
    idempotency_key: state.key,
    request_method: request.method,
    request_path: request.baseUrl + request.path,
    request_hash: state.hash,
    resource_type: resourceType,
    resource_id: resourceId,
    response_status: responseStatus,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (error && error.code !== '23505') {
    throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', '数据已保存，但暂时无法记录重试状态。');
  }
};

export const throwDatabaseError = (error: { code?: string; message?: string } | null, fallback: string): never => {
  if (error?.code === '23505') throw new ApiError(409, 'DUPLICATE_RESOURCE', '相同记录已经存在。');
  if (error?.code === '23503') throw new ApiError(404, 'NOT_FOUND', '关联的数据不存在。');
  throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', fallback);
};

export const throwMissingOrVersionConflict = async (
  client: SupabaseClient,
  table: string,
  id: string,
): Promise<never> => {
  const { data, error } = await client.from(table).select('id,version').eq('id', id).is('deleted_at', null).maybeSingle();
  if (error) throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', '暂时无法确认记录状态。');
  if (!data) throw new ApiError(404, 'NOT_FOUND', '没有找到这条记录。');
  throw new ApiError(409, 'VERSION_CONFLICT', '这条记录已在其他位置更新，请刷新后重试。', { currentVersion: data.version });
};
