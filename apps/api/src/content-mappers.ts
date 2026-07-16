import type {
  CareArticleDetailDto,
  CareArticleSummaryDto,
  PublicAssetDto,
  SpeciesDetailDto,
  SpeciesSummaryDto,
  SupportedLocale,
} from '../../../packages/contracts/src/index';
import { apiConfig } from './config';

type DbRow = Record<string, any>;

const publicAssetUrl = (bucket: string, storagePath: string) => (
  `${apiConfig.supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${storagePath.split('/').map(encodeURIComponent).join('/')}`
);

const mapAsset = (row: DbRow): PublicAssetDto => ({
  id: row.id,
  ...(row.step_id == null ? {} : { stepId: row.step_id }),
  variant: row.variant,
  mimeType: row.mime_type,
  ...(row.width == null ? {} : { width: row.width }),
  ...(row.height == null ? {} : { height: row.height }),
  ...(row.byte_size == null ? {} : { byteSize: Number(row.byte_size) }),
  assetVersion: row.asset_version,
  url: publicAssetUrl(row.storage_bucket, row.storage_path),
});

const currentAssets = (rows: DbRow[] | null | undefined) => (
  (rows || []).filter(row => row.storage_bucket === 'catalog-public' && row.is_current && !row.deleted_at).map(mapAsset)
);

const resolveTranslation = (rows: DbRow[] | null | undefined, requestedLocale: SupportedLocale) => {
  if (requestedLocale === 'zh-CN') return undefined;
  return (rows || []).find(row => row.locale === requestedLocale && row.status === 'published' && !row.deleted_at);
};

const localizationMeta = (requestedLocale: SupportedLocale, hasTranslation: boolean) => ({
  requestedLocale,
  resolvedLocale: hasTranslation ? requestedLocale : 'zh-CN' as SupportedLocale,
  usedFallback: requestedLocale !== 'zh-CN' && !hasTranslation,
});

export const mapSpeciesSummary = (row: DbRow, requestedLocale: SupportedLocale = 'zh-CN'): SpeciesSummaryDto => {
  const assets = currentAssets(row.species_assets);
  const translation = resolveTranslation(row.species_translations, requestedLocale);
  return {
    id: row.id,
    catalogKey: row.catalog_key,
    name: translation?.name || row.name,
    scientificName: row.scientific_name,
    category: translation?.category || row.category,
    difficulty: row.difficulty,
    waterTemperatureText: translation?.water_temperature_text || row.water_temperature_text,
    phLevelText: translation?.ph_level_text || row.ph_level_text,
    temperament: row.temperament,
    sizeClass: row.size_class,
    thumbnail: assets.find(asset => asset.variant === 'thumbnail'),
    updatedAt: row.updated_at,
    localization: localizationMeta(requestedLocale, Boolean(translation)),
  };
};

export const mapSpeciesDetail = (row: DbRow, requestedLocale: SupportedLocale = 'zh-CN'): SpeciesDetailDto => {
  const assets = currentAssets(row.species_assets);
  const translation = resolveTranslation(row.species_translations, requestedLocale);
  const feedingRow = row.species_feeding_profiles?.[0];
  const feedingTranslation = resolveTranslation(feedingRow?.species_feeding_profile_translations, requestedLocale);
  return {
    ...mapSpeciesSummary(row, requestedLocale),
    waterTemperatureMinC: row.water_temperature_min_c ?? undefined,
    waterTemperatureMaxC: row.water_temperature_max_c ?? undefined,
    phMin: row.ph_min ?? undefined,
    phMax: row.ph_max ?? undefined,
    waterChangeCycleDays: row.water_change_cycle_days,
    description: translation?.description || row.description,
    diet: translation?.diet || row.diet,
    tankSizeText: translation?.tank_size_text || row.tank_size_text,
    minTankLiters: row.min_tank_liters ?? undefined,
    housingMode: row.housing_mode ?? undefined,
    housingReason: translation?.housing_reason || row.housing_reason || undefined,
    feedingProfile: feedingRow
      ? {
          dietType: feedingTranslation?.diet_type || feedingRow.diet_type || undefined,
          feedingType: feedingTranslation?.feeding_type || feedingRow.feeding_type,
          recommendedFoods: feedingTranslation?.recommended_foods || feedingRow.recommended_foods,
          feedingFrequency: feedingTranslation?.feeding_frequency || feedingRow.feeding_frequency,
          portionRule: feedingTranslation?.portion_rule || feedingRow.portion_rule,
          feedingLayer: feedingTranslation?.feeding_layer || feedingRow.feeding_layer || undefined,
          avoidFoods: feedingTranslation?.avoid_foods || feedingRow.avoid_foods,
          specialNotes: feedingTranslation?.special_notes || feedingRow.special_notes || undefined,
          confidence: feedingRow.confidence ?? undefined,
          sourceName: feedingRow.source_name ?? undefined,
          sourceUrl: feedingRow.source_url ?? undefined,
          sourceFields: feedingRow.source_fields || [],
          needsReview: Boolean(feedingRow.needs_review),
          reviewReason: feedingRow.review_reason ?? undefined,
        }
      : undefined,
    assets,
  };
};

export const mapCareArticleSummary = (row: DbRow, requestedLocale: SupportedLocale = 'zh-CN'): CareArticleSummaryDto => {
  const assets = currentAssets(row.care_article_assets);
  const translation = resolveTranslation(row.care_article_translations, requestedLocale);
  return {
    id: row.id,
    catalogKey: row.catalog_key,
    title: translation?.title || row.title,
    category: translation?.category || row.category,
    urgency: row.urgency,
    summary: translation?.summary || row.summary,
    keywords: translation?.keywords || row.keywords || [],
    image: assets.find(asset => asset.variant === 'article_main'),
    updatedAt: row.updated_at,
    localization: localizationMeta(requestedLocale, Boolean(translation)),
  };
};

export const mapCareArticleDetail = (row: DbRow, requestedLocale: SupportedLocale = 'zh-CN'): CareArticleDetailDto => {
  const assets = currentAssets(row.care_article_assets);
  const translation = resolveTranslation(row.care_article_translations, requestedLocale);
  const steps = (row.care_article_steps || [])
    .filter((step: DbRow) => !step.deleted_at)
    .sort((left: DbRow, right: DbRow) => left.position - right.position)
    .map((step: DbRow) => {
      const stepTranslation = resolveTranslation(step.care_article_step_translations, requestedLocale);
      return {
        id: step.id,
        position: step.position,
        instruction: stepTranslation?.instruction || step.instruction,
        durationLabel: stepTranslation?.duration_label || step.duration_label || undefined,
        image: assets.find(asset => asset.variant === 'article_step' && asset.stepId === step.id),
      };
    });
  return {
    ...mapCareArticleSummary(row, requestedLocale),
    symptoms: translation?.symptoms || row.symptoms || [],
    avoidActions: translation?.avoid_actions || row.avoid_actions || [],
    observeItems: translation?.observe_items || row.observe_items || [],
    diagnoseWhen: translation?.diagnose_when || row.diagnose_when || [],
    nextStep: translation?.next_step || row.next_step,
    steps,
    assets,
  };
};
