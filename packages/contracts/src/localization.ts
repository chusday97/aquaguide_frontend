import { z } from 'zod';
import { uuidSchema, versionSchema } from './business';

export const supportedLocaleSchema = z.enum(['zh-CN', 'en']);
export type SupportedLocale = z.infer<typeof supportedLocaleSchema>;

export interface LocalizedContentMeta {
  requestedLocale: SupportedLocale;
  resolvedLocale: SupportedLocale;
  usedFallback: boolean;
}

export const localePreferenceSchema = z.object({
  locale: supportedLocaleSchema,
  updatedAt: z.string().datetime(),
  source: z.enum(['browser', 'user', 'profile']),
});
export type LocalePreference = z.infer<typeof localePreferenceSchema>;

export const profileLocaleUpdateSchema = z.object({
  locale: supportedLocaleSchema,
  version: versionSchema,
});

export const onboardingPreferenceSchema = z.object({
  version: z.literal(1),
  status: z.enum(['pending', 'completed', 'skipped']),
  goal: z.enum(['build_tank', 'browse_species']).optional(),
  viewedSpecies: z.boolean(),
  aquariumConfigured: z.boolean().default(false),
  taskCardDismissed: z.boolean(),
  completedAt: z.string().datetime().optional(),
});

export const profilePreferencesUpdateSchema = z.object({
  locale: supportedLocaleSchema.optional(),
  onboarding: onboardingPreferenceSchema.optional(),
  version: versionSchema,
}).refine(value => value.locale !== undefined || value.onboarding !== undefined, {
  message: '至少提供一项偏好设置。',
});

export const translationStatusSchema = z.enum(['draft', 'published', 'archived']);

export const translationReviewSchema = z.object({
  translationId: uuidSchema,
  version: versionSchema,
});

export interface TranslationCoverageDto {
  locale: SupportedLocale;
  species: { published: number; total: number };
  feedingProfiles: { published: number; total: number };
  careArticles: { published: number; total: number };
  careArticleSteps: { published: number; total: number };
  readyForPublicUse: boolean;
}
