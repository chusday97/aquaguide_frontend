export type Uuid = string;
export type IsoDate = string;
export type IsoDateTime = string;

export type ContentStatus = 'draft' | 'published' | 'archived';
export type SupportedLocale = 'zh-CN' | 'en';
export type UserRole = 'user' | 'admin';
export type AssetVariant = 'original' | 'thumbnail' | 'detail' | 'texture' | 'article_main' | 'article_step';
export type WaterType = 'Freshwater' | 'Saltwater';
export type ComponentType = 'substrate' | 'plant' | 'hardscape';
export type CareEventType = 'water_change' | 'feeding' | 'observation' | 'checklist_completed';
export type MigrationStatus = 'previewed' | 'committing' | 'completed' | 'failed';

export interface SyncFields {
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  deletedAt?: IsoDateTime;
  version: number;
}

export interface Profile extends SyncFields {
  id: Uuid;
  userId: Uuid;
  nickname?: string;
  preferences: Record<string, unknown>;
}

export interface UserRoleRecord extends SyncFields {
  id: Uuid;
  userId: Uuid;
  role: UserRole;
}

export interface SpeciesRecord extends SyncFields {
  id: Uuid;
  catalogKey: string;
  name: string;
  scientificName: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  waterTemperatureText: string;
  waterTemperatureMinC?: number;
  waterTemperatureMaxC?: number;
  phLevelText: string;
  phMin?: number;
  phMax?: number;
  waterChangeCycleDays: number;
  description: string;
  diet: string;
  tankSizeText: string;
  minTankLiters?: number;
  temperament: 'Peaceful' | 'Aggressive' | 'Territorial';
  sizeClass: 'Small' | 'Medium' | 'Large';
  housingMode?: '适合混养' | '谨慎混养' | '建议单养';
  housingReason?: string;
  isCustom: boolean;
  searchTerms: string[];
  status: ContentStatus;
  publishedAt?: IsoDateTime;
}

export interface SpeciesFeedingProfileRecord extends SyncFields {
  id: Uuid;
  speciesId: Uuid;
  dietType?: string;
  feedingType: string;
  recommendedFoods: string;
  feedingFrequency: string;
  portionRule: string;
  feedingLayer?: string;
  avoidFoods: string;
  specialNotes?: string;
  confidence?: string;
  sourceName?: string;
  sourceUrl?: string;
  sourceFields: string[];
  needsReview: boolean;
  reviewReason?: string;
}

export interface SpeciesAssetRecord extends SyncFields {
  id: Uuid;
  speciesId: Uuid;
  variant: AssetVariant;
  storageBucket: string;
  storagePath: string;
  mimeType: string;
  width?: number;
  height?: number;
  byteSize?: number;
  checksumSha256?: string;
  assetVersion: number;
  isCurrent: boolean;
}

export interface SpeciesTranslationRecord extends SyncFields {
  id: Uuid;
  speciesId: Uuid;
  locale: SupportedLocale;
  status: ContentStatus;
  name: string;
  category: string;
  waterTemperatureText: string;
  phLevelText: string;
  description: string;
  diet: string;
  tankSizeText: string;
  housingMode?: string;
  housingReason?: string;
  searchTerms: string[];
  reviewedAt?: IsoDateTime;
  reviewedBy?: Uuid;
}

export interface SpeciesFeedingProfileTranslationRecord extends SyncFields {
  id: Uuid;
  feedingProfileId: Uuid;
  locale: SupportedLocale;
  status: ContentStatus;
  dietType?: string;
  feedingType: string;
  recommendedFoods: string;
  feedingFrequency: string;
  portionRule: string;
  feedingLayer?: string;
  avoidFoods: string;
  specialNotes?: string;
  reviewedAt?: IsoDateTime;
  reviewedBy?: Uuid;
}

export interface CareArticleRecord extends SyncFields {
  id: Uuid;
  catalogKey: string;
  title: string;
  category: string;
  urgency: '日常' | '尽快处理' | '高优先级';
  summary: string;
  symptoms: string[];
  avoidActions: string[];
  observeItems: string[];
  diagnoseWhen: string[];
  nextStep: string;
  keywords: string[];
  status: ContentStatus;
  publishedAt?: IsoDateTime;
}

export interface CareArticleStepRecord extends SyncFields {
  id: Uuid;
  articleId: Uuid;
  position: number;
  instruction: string;
  durationLabel?: string;
}

export interface CareArticleAssetRecord extends SyncFields {
  id: Uuid;
  articleId: Uuid;
  stepId?: Uuid;
  variant: 'original' | 'article_main' | 'article_step';
  storageBucket: string;
  storagePath: string;
  mimeType: string;
  width?: number;
  height?: number;
  byteSize?: number;
  checksumSha256?: string;
  assetVersion: number;
  isCurrent: boolean;
}

export interface CareArticleTranslationRecord extends SyncFields {
  id: Uuid;
  articleId: Uuid;
  locale: SupportedLocale;
  status: ContentStatus;
  title: string;
  category: string;
  urgency: string;
  summary: string;
  symptoms: string[];
  avoidActions: string[];
  observeItems: string[];
  diagnoseWhen: string[];
  nextStep: string;
  keywords: string[];
  reviewedAt?: IsoDateTime;
  reviewedBy?: Uuid;
}

export interface CareArticleStepTranslationRecord extends SyncFields {
  id: Uuid;
  stepId: Uuid;
  locale: SupportedLocale;
  status: ContentStatus;
  instruction: string;
  durationLabel?: string;
  reviewedAt?: IsoDateTime;
  reviewedBy?: Uuid;
}

export interface AquariumRecord extends SyncFields {
  id: Uuid;
  ownerId: Uuid;
  name: string;
  waterType?: WaterType;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  targetTemperatureC?: number;
  lastWaterChangeAt?: IsoDateTime;
  lastWaterStoredAt?: IsoDateTime;
}

export interface AquariumSpeciesRecord extends SyncFields {
  id: Uuid;
  aquariumId: Uuid;
  speciesId?: Uuid;
  speciesCatalogKey: string;
  quantity: number;
  entryDate: IsoDate;
  lastWaterChangeAt?: IsoDateTime;
}

export interface AquariumEquipmentRecord extends SyncFields {
  id: Uuid;
  aquariumId: Uuid;
  filterType?: string;
  heater?: boolean;
  oxygen?: boolean;
  lightType?: string;
}

export interface AquariumComponentRecord extends SyncFields {
  id: Uuid;
  aquariumId: Uuid;
  componentType: ComponentType;
  name: string;
  quantity?: number;
}

export interface DiagnosisRecordRow extends SyncFields {
  id: Uuid;
  ownerId: Uuid;
  aquariumId: Uuid;
  diagnosisKey: string;
  localDate: IsoDate;
  problemType: string;
  sourceType?: string;
  sourceTitle?: string;
  answers: Record<string, string>;
  structuredAnswers: Array<{ questionId: string; question: string; answer: string }>;
  resultSummary: string;
  riskLevel: string;
  riskCode?: 'low' | 'medium' | 'high' | 'unknown';
  conclusion?: string;
  keyMetrics: Array<{ label: string; value: string }>;
  suggestedActions: string[];
  avoidActions: string[];
  observeItems: string[];
  missingInfo: string[];
  optionalMissingInfo: string[];
  nextCheckAt?: IsoDateTime;
  followUpNotes: string[];
}

export interface SpeciesFavoriteRecord extends SyncFields {
  id: Uuid;
  ownerId: Uuid;
  speciesId: Uuid;
}

export interface CareFavoriteRecord extends SyncFields {
  id: Uuid;
  ownerId: Uuid;
  articleId: Uuid;
}

export interface MemorialRecordRow extends SyncFields {
  id: Uuid;
  ownerId: Uuid;
  aquariumId?: Uuid;
  speciesId?: Uuid;
  speciesCatalogKey: string;
  memorialDate: IsoDate;
  reason?: string;
}

export interface CareReminderRecordRow extends SyncFields {
  id: Uuid;
  ownerId: Uuid;
  aquariumId?: Uuid;
  sourceArticleId?: Uuid;
  sourceCatalogKey: string;
  title: string;
  reminderType: string;
  scheduledFor: IsoDateTime;
  label?: string;
  completedAt?: IsoDateTime;
}

export interface CareEventRecord extends SyncFields {
  id: Uuid;
  ownerId: Uuid;
  aquariumId?: Uuid;
  eventType: CareEventType;
  title: string;
  label?: string;
  payload: Record<string, unknown>;
  occurredAt: IsoDateTime;
}

export interface MigrationBatchRecord extends SyncFields {
  id: Uuid;
  ownerId: Uuid;
  idempotencyKey: string;
  sourceVersion: number;
  status: MigrationStatus;
  previewSummary: MigrationPreviewSummary;
  resultSummary?: Record<string, unknown>;
  errorSummary?: Record<string, unknown>;
  committedAt?: IsoDateTime;
}

export interface IdempotencyRecord extends SyncFields {
  id: Uuid;
  ownerId: Uuid;
  idempotencyKey: string;
  requestMethod: string;
  requestPath: string;
  requestHash: string;
  resourceType?: string;
  resourceId?: Uuid;
  responseStatus: number;
  expiresAt: IsoDateTime;
}

export interface MigrationPreviewSummary {
  aquariums: number;
  speciesFavorites: number;
  careFavorites: number;
  diagnosisRecords: number;
  memorialRecords: number;
  careReminders: number;
  careEvents: number;
  duplicates: number;
  invalidRecords: number;
  unknownCatalogKeys: string[];
}

export interface AquariumWithRelations extends AquariumRecord {
  species: AquariumSpeciesRecord[];
  equipment?: AquariumEquipmentRecord;
  components: AquariumComponentRecord[];
}

export interface SpeciesWithRelations extends SpeciesRecord {
  feedingProfile?: SpeciesFeedingProfileRecord;
  assets: SpeciesAssetRecord[];
  translations?: SpeciesTranslationRecord[];
}

export interface CareArticleWithRelations extends CareArticleRecord {
  steps: CareArticleStepRecord[];
  assets: CareArticleAssetRecord[];
  translations?: CareArticleTranslationRecord[];
}

type TableDefinition<Row extends { id: Uuid }> = {
  Row: Row;
  Insert: Omit<Row, keyof SyncFields | 'id' | 'ownerId'> & Partial<Pick<Row, Extract<keyof Row, 'id' | 'ownerId'>>>;
  Update: Partial<Omit<Row, 'id' | 'createdAt'>> & { version: number };
};

export interface Database {
  public: {
    Tables: {
      profiles: TableDefinition<Profile>;
      userRoles: TableDefinition<UserRoleRecord>;
      species: TableDefinition<SpeciesRecord>;
      speciesFeedingProfiles: TableDefinition<SpeciesFeedingProfileRecord>;
      speciesAssets: TableDefinition<SpeciesAssetRecord>;
      speciesTranslations: TableDefinition<SpeciesTranslationRecord>;
      speciesFeedingProfileTranslations: TableDefinition<SpeciesFeedingProfileTranslationRecord>;
      careArticles: TableDefinition<CareArticleRecord>;
      careArticleSteps: TableDefinition<CareArticleStepRecord>;
      careArticleAssets: TableDefinition<CareArticleAssetRecord>;
      careArticleTranslations: TableDefinition<CareArticleTranslationRecord>;
      careArticleStepTranslations: TableDefinition<CareArticleStepTranslationRecord>;
      aquariums: TableDefinition<AquariumRecord>;
      aquariumSpecies: TableDefinition<AquariumSpeciesRecord>;
      aquariumEquipment: TableDefinition<AquariumEquipmentRecord>;
      aquariumComponents: TableDefinition<AquariumComponentRecord>;
      diagnosisRecords: TableDefinition<DiagnosisRecordRow>;
      speciesFavorites: TableDefinition<SpeciesFavoriteRecord>;
      careFavorites: TableDefinition<CareFavoriteRecord>;
      memorialRecords: TableDefinition<MemorialRecordRow>;
      careReminders: TableDefinition<CareReminderRecordRow>;
      careEvents: TableDefinition<CareEventRecord>;
      migrationBatches: TableDefinition<MigrationBatchRecord>;
      idempotencyRecords: TableDefinition<IdempotencyRecord>;
    };
  };
}
