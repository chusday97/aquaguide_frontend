import { z } from 'zod';
import { uuidSchema, versionSchema } from './business';

export const speciesAdminInputSchema = z.object({
  catalogKey: z.string().trim().min(1).max(160).regex(/^[\w.-]+$/),
  name: z.string().trim().min(1).max(160),
  scientificName: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  waterTemperatureText: z.string().trim().min(1).max(80),
  waterTemperatureMinC: z.number().optional(),
  waterTemperatureMaxC: z.number().optional(),
  phLevelText: z.string().trim().min(1).max(80),
  phMin: z.number().optional(),
  phMax: z.number().optional(),
  waterChangeCycleDays: z.number().int().positive(),
  description: z.string().trim().min(1).max(10000),
  diet: z.string().trim().min(1).max(1000),
  tankSizeText: z.string().trim().min(1).max(160),
  minTankLiters: z.number().positive().optional(),
  temperament: z.enum(['Peaceful', 'Aggressive', 'Territorial']),
  sizeClass: z.enum(['Small', 'Medium', 'Large']),
  housingMode: z.enum(['适合混养', '谨慎混养', '建议单养']).optional(),
  housingReason: z.string().max(2000).optional(),
  isCustom: z.boolean().default(false),
  searchTerms: z.array(z.string()).default([]),
});

export const speciesAdminUpdateSchema = speciesAdminInputSchema.partial().extend({ version: versionSchema });

export const careArticleAdminInputSchema = z.object({
  catalogKey: z.string().trim().min(1).max(160).regex(/^[\w.-]+$/),
  title: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100),
  urgency: z.enum(['日常', '尽快处理', '高优先级']),
  summary: z.string().trim().min(1).max(4000),
  symptoms: z.array(z.string()).default([]),
  steps: z.array(z.object({ instruction: z.string().trim().min(1), durationLabel: z.string().optional() })).default([]),
  avoidActions: z.array(z.string()).default([]),
  observeItems: z.array(z.string()).default([]),
  diagnoseWhen: z.array(z.string()).default([]),
  nextStep: z.string().trim().min(1).max(4000),
  keywords: z.array(z.string()).default([]),
});

export const careArticleAdminUpdateSchema = careArticleAdminInputSchema.partial().extend({ version: versionSchema });

export const contentStatusMutationSchema = z.object({ version: versionSchema });

export const assetUploadQuerySchema = z.object({
  contentType: z.enum(['species', 'care']),
  contentId: uuidSchema,
  stepId: uuidSchema.optional(),
  fileName: z.string().trim().min(1).max(240),
});
