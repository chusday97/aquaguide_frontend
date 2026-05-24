import { z } from 'zod';
import type { Aquarium, Fish } from '../../types';
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
