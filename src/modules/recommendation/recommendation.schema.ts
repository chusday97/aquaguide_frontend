import { z } from 'zod';
import type { Aquarium, Fish } from '../../types';
import type { TankCompatibilityRule, TankCompatibilityStatus } from '../../lib/tankCompatibilityEngine';
import { aquariumSchema } from '../aquarium/aquarium.schema';
import { fishSchema } from '../species/species.schema';

export const recommendationInputSchema = z.object({
  aquarium: aquariumSchema,
  speciesPool: z.array(fishSchema).default([]),
  limit: z.number().int().positive().max(20).default(10),
});

export const recommendationItemSchema = z.object({
  speciesId: z.string().min(1),
  reason: z.string().min(1),
  confidence: z.enum(['low', 'medium', 'high']).default('medium'),
  riskLevel: z.enum(['low', 'medium', 'high']).default('medium'),
  canAdd: z.boolean().default(true),
  compatibilityStatus: z.enum(['compatible', 'caution', 'not_recommended', 'insufficient_data']).optional(),
  ruleSummary: z.string().optional(),
  passedRules: z.array(z.object({
    code: z.string(),
    title: z.string(),
    evidence: z.string(),
    severity: z.enum(['info', 'low', 'medium', 'high']),
  })).optional(),
  warningRules: z.array(z.object({
    code: z.string(),
    title: z.string(),
    evidence: z.string(),
    severity: z.enum(['info', 'low', 'medium', 'high']),
  })).optional(),
  blockingRules: z.array(z.object({
    code: z.string(),
    title: z.string(),
    evidence: z.string(),
    severity: z.enum(['info', 'low', 'medium', 'high']),
  })).optional(),
  missingData: z.array(z.object({
    code: z.string(),
    title: z.string(),
    evidence: z.string(),
    severity: z.enum(['info', 'low', 'medium', 'high']),
  })).optional(),
});

export const recommendationOutputSchema = z.object({
  items: z.array(recommendationItemSchema),
});

export const discoveryHistoryItemSchema = z.object({
  id: z.string().min(1),
  dateKey: z.string().min(1),
});

export const discoveryDeckStateSchema = z.object({
  dateKey: z.string().min(1),
  queueIds: z.array(z.string()).default([]),
  consumedIds: z.array(z.string()).default([]),
  history: z.array(discoveryHistoryItemSchema).default([]),
});

export const discoveryDeckInputSchema = z.object({
  speciesPool: z.array(fishSchema).default([]),
  wishlistIds: z.array(z.string()).default([]),
  state: discoveryDeckStateSchema.partial().optional(),
  dailyLimit: z.number().int().positive().max(30).default(10),
  historyDays: z.number().int().positive().max(30).default(7),
});

export const discoveryDeckOutputSchema = z.object({
  state: discoveryDeckStateSchema,
  queueIds: z.array(z.string()),
  remainingToday: z.number().int().min(0),
  currentSpeciesId: z.string().nullable(),
  nextSpeciesId: z.string().nullable(),
});

export const discoveryAdvanceInputSchema = z.object({
  speciesId: z.string().min(1),
  action: z.enum(['skip', 'interest']),
  speciesPool: z.array(fishSchema).default([]),
  wishlistIds: z.array(z.string()).default([]),
  state: discoveryDeckStateSchema.partial().optional(),
  dailyLimit: z.number().int().positive().max(30).default(10),
  historyDays: z.number().int().positive().max(30).default(7),
});

export const discoveryAdvanceOutputSchema = z.object({
  state: discoveryDeckStateSchema,
  addedWishlistId: z.string().nullable(),
  message: z.string(),
  remainingToday: z.number().int().min(0),
});

export type RecommendationInput = z.infer<typeof recommendationInputSchema>;
export type RecommendationItem = {
  speciesId: string;
  reason: string;
  confidence: 'low' | 'medium' | 'high';
  riskLevel: 'low' | 'medium' | 'high';
  canAdd: boolean;
  compatibilityStatus?: TankCompatibilityStatus;
  ruleSummary?: string;
  passedRules?: TankCompatibilityRule[];
  warningRules?: TankCompatibilityRule[];
  blockingRules?: TankCompatibilityRule[];
  missingData?: TankCompatibilityRule[];
};
export type RecommendationOutput = { items: RecommendationItem[] };
export type DiscoveryDeckState = {
  dateKey: string;
  queueIds: string[];
  consumedIds: string[];
  history: { id: string; dateKey: string }[];
};
export type DiscoveryDeckInput = {
  speciesPool: Fish[];
  wishlistIds?: string[];
  state?: Partial<DiscoveryDeckState>;
  dailyLimit?: number;
  historyDays?: number;
};
export type DiscoveryDeckOutput = {
  state: DiscoveryDeckState;
  queueIds: string[];
  remainingToday: number;
  currentSpeciesId: string | null;
  nextSpeciesId: string | null;
};
export type DiscoveryAdvanceInput = {
  speciesId: string;
  action: 'skip' | 'interest';
  speciesPool: Fish[];
  wishlistIds?: string[];
  state?: Partial<DiscoveryDeckState>;
  dailyLimit?: number;
  historyDays?: number;
};
export type DiscoveryAdvanceOutput = {
  state: DiscoveryDeckState;
  addedWishlistId: string | null;
  message: string;
  remainingToday: number;
};
export type CompatibleRecommendationInput = {
  aquarium: Aquarium;
  speciesPool: Fish[];
  limit?: number;
};

export type RecommendationMode = 'empty_tank' | 'existing_livestock';
export type LoadStatus = 'relaxed' | 'moderate' | 'near_limit' | 'over_limit';
export type CandidateStatus = 'direct' | 'adjustable' | 'blocked';

export type UserPreference = {
  experience?: 'beginner' | 'intermediate' | 'advanced';
  maintenance?: 'low' | 'balanced' | 'high';
  visualStyle?: string[];
  keywords?: string[];
  naturalLanguage?: string;
};

export type TankLoadModel = {
  currentLoad: number;
  capacity: number;
  loadRate: number;
  status: LoadStatus;
  remainingCapacity: number;
};

export type AquariumProfile = {
  id: string;
  name: string;
  mode: RecommendationMode;
  volumeLiters: number;
  effectiveVolumeLiters: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  waterType: string;
  temperature: number | null;
  equipment: string[];
  substrate: string;
  plants: string[];
  hardscape: string[];
  livestock: Array<{
    speciesId: string;
    name: string;
    quantity: number;
    category: string;
    size?: string;
    temperament?: string;
  }>;
  load: TankLoadModel;
  waterLayers: Record<string, number>;
  missingData: string[];
  availableNiches: string[];
};

export type RecommendationCandidate = {
  speciesId: string;
  name: string;
  status: CandidateStatus;
  recommendedQuantity: number;
  fitScore: number;
  reason: string;
  risks: string[];
  requiredAdjustments: string[];
  confidence: 'low' | 'medium' | 'high';
  loadAfterAdd: number;
};

export type EmptyTankPlan = {
  id: string;
  name: string;
  audience: string;
  species: Array<{ speciesId: string; name: string; quantity: number }>;
  maintenanceLevel: '低' | '中' | '高';
  estimatedLoadRate: number;
  strengths: string[];
  cautions: string[];
};

export type SimulationResult = {
  candidate: RecommendationCandidate;
  quantity: number;
  beforeLoadRate: number;
  afterLoadRate: number;
  waterLayerChange: Record<string, number>;
  compatibilityChange: string[];
  equipmentStillFits: boolean;
  newRisks: string[];
  conclusion: string;
};

export type SmartRecommendationOutput = {
  mode: RecommendationMode;
  profile: AquariumProfile;
  direct: RecommendationCandidate[];
  adjustable: RecommendationCandidate[];
  blocked: RecommendationCandidate[];
  emptyPlans: EmptyTankPlan[];
  blockedSummary: string[];
  needsMoreInfo: boolean;
  infoRequests: string[];
  localSummary: string;
};
