import type {
  CareArticleDetailDto,
  CareArticleSummaryDto,
  PublicAssetDto,
  SpeciesDetailDto,
  SpeciesSummaryDto,
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

export const mapSpeciesSummary = (row: DbRow): SpeciesSummaryDto => {
  const assets = currentAssets(row.species_assets);
  return {
    id: row.id,
    catalogKey: row.catalog_key,
    name: row.name,
    scientificName: row.scientific_name,
    category: row.category,
    difficulty: row.difficulty,
    waterTemperatureText: row.water_temperature_text,
    phLevelText: row.ph_level_text,
    temperament: row.temperament,
    sizeClass: row.size_class,
    thumbnail: assets.find(asset => asset.variant === 'thumbnail'),
    updatedAt: row.updated_at,
  };
};

export const mapSpeciesDetail = (row: DbRow): SpeciesDetailDto => {
  const assets = currentAssets(row.species_assets);
  return {
    ...mapSpeciesSummary(row),
    waterTemperatureMinC: row.water_temperature_min_c ?? undefined,
    waterTemperatureMaxC: row.water_temperature_max_c ?? undefined,
    phMin: row.ph_min ?? undefined,
    phMax: row.ph_max ?? undefined,
    waterChangeCycleDays: row.water_change_cycle_days,
    description: row.description,
    diet: row.diet,
    tankSizeText: row.tank_size_text,
    minTankLiters: row.min_tank_liters ?? undefined,
    housingMode: row.housing_mode ?? undefined,
    housingReason: row.housing_reason ?? undefined,
    feedingProfile: row.species_feeding_profiles?.[0]
      ? {
          dietType: row.species_feeding_profiles[0].diet_type ?? undefined,
          feedingType: row.species_feeding_profiles[0].feeding_type,
          recommendedFoods: row.species_feeding_profiles[0].recommended_foods,
          feedingFrequency: row.species_feeding_profiles[0].feeding_frequency,
          portionRule: row.species_feeding_profiles[0].portion_rule,
          feedingLayer: row.species_feeding_profiles[0].feeding_layer ?? undefined,
          avoidFoods: row.species_feeding_profiles[0].avoid_foods,
          specialNotes: row.species_feeding_profiles[0].special_notes ?? undefined,
          confidence: row.species_feeding_profiles[0].confidence ?? undefined,
          sourceName: row.species_feeding_profiles[0].source_name ?? undefined,
          sourceUrl: row.species_feeding_profiles[0].source_url ?? undefined,
          sourceFields: row.species_feeding_profiles[0].source_fields || [],
          needsReview: Boolean(row.species_feeding_profiles[0].needs_review),
          reviewReason: row.species_feeding_profiles[0].review_reason ?? undefined,
        }
      : undefined,
    assets,
  };
};

export const mapCareArticleSummary = (row: DbRow): CareArticleSummaryDto => {
  const assets = currentAssets(row.care_article_assets);
  return {
    id: row.id,
    catalogKey: row.catalog_key,
    title: row.title,
    category: row.category,
    urgency: row.urgency,
    summary: row.summary,
    keywords: row.keywords || [],
    image: assets.find(asset => asset.variant === 'article_main'),
    updatedAt: row.updated_at,
  };
};

export const mapCareArticleDetail = (row: DbRow): CareArticleDetailDto => {
  const assets = currentAssets(row.care_article_assets);
  const steps = (row.care_article_steps || [])
    .filter((step: DbRow) => !step.deleted_at)
    .sort((left: DbRow, right: DbRow) => left.position - right.position)
    .map((step: DbRow) => ({
      id: step.id,
      position: step.position,
      instruction: step.instruction,
      durationLabel: step.duration_label ?? undefined,
      image: assets.find(asset => asset.variant === 'article_step' && asset.stepId === step.id),
    }));
  return {
    ...mapCareArticleSummary(row),
    symptoms: row.symptoms || [],
    avoidActions: row.avoid_actions || [],
    observeItems: row.observe_items || [],
    diagnoseWhen: row.diagnose_when || [],
    nextStep: row.next_step,
    steps,
    assets,
  };
};
