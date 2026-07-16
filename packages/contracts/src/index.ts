import { z } from 'zod';

export * from './business';
export * from './content-admin';
export * from './localization';

import type { LocalizedContentMeta } from './localization';
import { supportedLocaleSchema } from './localization';

export const apiErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'AUTH_REQUIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VERSION_CONFLICT',
  'DUPLICATE_RESOURCE',
  'PAYLOAD_TOO_LARGE',
  'MIGRATION_REJECTED',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
  'DEPENDENCY_UNAVAILABLE',
]);

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

export interface ApiSuccess<T> {
  data: T;
  requestId: string;
}

export interface ApiFailure {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
  requestId: string;
}

export interface Page<T> {
  items: T[];
  nextCursor?: string;
}

export const pageQuerySchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

export const speciesListQuerySchema = pageQuerySchema.extend({
  locale: supportedLocaleSchema.default('zh-CN'),
  category: z.string().trim().min(1).max(80).optional(),
  query: z.string().trim().min(1).max(100).optional(),
});

export const careArticleListQuerySchema = pageQuerySchema.extend({
  locale: supportedLocaleSchema.default('zh-CN'),
  category: z.string().trim().min(1).max(80).optional(),
  urgency: z.enum(['日常', '尽快处理', '高优先级']).optional(),
  query: z.string().trim().min(1).max(100).optional(),
});

export const catalogKeySchema = z.string().trim().min(1).max(160).regex(/^[\w.-]+$/);

export interface PublicAssetDto {
  id: string;
  stepId?: string;
  variant: string;
  mimeType: string;
  width?: number;
  height?: number;
  byteSize?: number;
  assetVersion: number;
  url: string;
}

export interface SpeciesSummaryDto {
  id: string;
  catalogKey: string;
  name: string;
  scientificName: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  waterTemperatureText: string;
  phLevelText: string;
  temperament: 'Peaceful' | 'Aggressive' | 'Territorial';
  sizeClass: 'Small' | 'Medium' | 'Large';
  thumbnail?: PublicAssetDto;
  updatedAt: string;
  localization: LocalizedContentMeta;
}

export interface SpeciesDetailDto extends SpeciesSummaryDto {
  waterTemperatureMinC?: number;
  waterTemperatureMaxC?: number;
  phMin?: number;
  phMax?: number;
  waterChangeCycleDays: number;
  description: string;
  diet: string;
  tankSizeText: string;
  minTankLiters?: number;
  housingMode?: '适合混养' | '谨慎混养' | '建议单养';
  housingReason?: string;
  feedingProfile?: Record<string, unknown>;
  assets: PublicAssetDto[];
}

export interface CareArticleSummaryDto {
  id: string;
  catalogKey: string;
  title: string;
  category: string;
  urgency: '日常' | '尽快处理' | '高优先级';
  summary: string;
  keywords: string[];
  image?: PublicAssetDto;
  updatedAt: string;
  localization: LocalizedContentMeta;
}

export interface CareArticleDetailDto extends CareArticleSummaryDto {
  symptoms: string[];
  avoidActions: string[];
  observeItems: string[];
  diagnoseWhen: string[];
  nextStep: string;
  steps: Array<{
    id: string;
    position: number;
    instruction: string;
    durationLabel?: string;
    image?: PublicAssetDto;
  }>;
  assets: PublicAssetDto[];
}
