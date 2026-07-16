import type { z } from 'zod';
import {
  careArticleAdminInputSchema,
  speciesAdminInputSchema,
} from '../../../packages/contracts/src/index';
import {
  apiRequest,
  AquaGuideApiError,
  createIdempotencyKey,
  getApiAccessToken,
} from '../api/api-client';

export type SpeciesAdminInput = z.infer<typeof speciesAdminInputSchema>;
export type CareArticleAdminInput = z.infer<typeof careArticleAdminInputSchema>;

export type AdminAssetRecord = {
  id: string;
  variant: string;
  storageBucket: string;
  storagePath: string;
  assetVersion: number;
  isCurrent: boolean;
};

export type AdminSpeciesRecord = SpeciesAdminInput & {
  id: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  speciesAssets?: AdminAssetRecord[];
};

export type AdminCareArticleRecord = Omit<CareArticleAdminInput, 'steps'> & {
  id: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  careArticleSteps?: Array<{ id: string; position: number; instruction: string; durationLabel?: string }>;
  careArticleAssets?: AdminAssetRecord[];
};

const parseUploadResponse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => null) as {
    data?: T;
    error?: { code?: string; message?: string; details?: unknown };
    requestId?: string;
  } | null;
  if (!response.ok || !payload?.data) {
    throw new AquaGuideApiError(
      response.status,
      (payload?.error?.code as AquaGuideApiError['code']) || 'INTERNAL_ERROR',
      payload?.error?.message || '图片没有上传成功。',
      payload?.requestId,
      payload?.error?.details,
    );
  }
  return payload.data;
};

export const contentAdminService = {
  listSpecies: () => apiRequest<AdminSpeciesRecord[]>('/admin/species'),
  listCareArticles: () => apiRequest<AdminCareArticleRecord[]>('/admin/care-articles'),

  createSpecies: (input: SpeciesAdminInput) => apiRequest<AdminSpeciesRecord>('/admin/species', {
    method: 'POST',
    body: input,
    idempotencyKey: createIdempotencyKey('admin-species-create'),
  }),

  updateSpecies: (id: string, version: number, input: SpeciesAdminInput) => apiRequest<AdminSpeciesRecord>(`/admin/species/${id}`, {
    method: 'PATCH',
    body: { ...input, version },
    idempotencyKey: createIdempotencyKey('admin-species-update'),
  }),

  createCareArticle: (input: CareArticleAdminInput) => apiRequest<AdminCareArticleRecord>('/admin/care-articles', {
    method: 'POST',
    body: input,
    idempotencyKey: createIdempotencyKey('admin-care-create'),
  }),

  updateCareArticle: (id: string, version: number, input: CareArticleAdminInput) => apiRequest<AdminCareArticleRecord>(`/admin/care-articles/${id}`, {
    method: 'PATCH',
    body: { ...input, version },
    idempotencyKey: createIdempotencyKey('admin-care-update'),
  }),

  setStatus: (type: 'species' | 'care', id: string, version: number, status: 'published' | 'archived') => (
    apiRequest<AdminSpeciesRecord | AdminCareArticleRecord>(`/admin/content/${type}/${id}/${status === 'published' ? 'publish' : 'archive'}`, {
      method: 'POST',
      body: { version },
      idempotencyKey: createIdempotencyKey(`admin-${status}`),
    })
  ),

  async uploadAsset(type: 'species' | 'care', contentId: string, file: File, stepId?: string) {
    const query = new URLSearchParams({ contentType: type, contentId, fileName: file.name });
    if (stepId) query.set('stepId', stepId);
    let response: Response;
    try {
      response = await fetch(`/api/v1/admin/assets?${query}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await getApiAccessToken()}`,
          'Content-Type': file.type,
          'Idempotency-Key': createIdempotencyKey('admin-asset'),
        },
        body: file,
      });
    } catch {
      throw new AquaGuideApiError(0, 'DEPENDENCY_UNAVAILABLE', '网络连接失败，图片没有上传。');
    }
    return parseUploadResponse<AdminAssetRecord[]>(response);
  },
};
