import { z } from 'zod';
import type { Fish } from '../../types';

export const lifeTypeSchema = z.enum(['All', 'fish', 'freshwaterFish', 'saltwaterFish', 'invertebrate', 'reptile', 'coral', 'plant', 'hardscape']);

export const fishSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  scientificName: z.string().default(''),
  category: z.string().default('鱼类'),
  image: z.string().default(''),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  waterTemperature: z.string().default(''),
  phLevel: z.string().default(''),
  waterChangeCycle: z.number().int().positive(),
  description: z.string().default(''),
  diet: z.string().default(''),
  feedingProfile: z.object({
    dietType: z.string().optional(),
    feedingType: z.string(),
    recommendedFoods: z.string(),
    feedingFrequency: z.string(),
    portionRule: z.string(),
    feedingLayer: z.string().optional(),
    avoidFoods: z.string(),
    specialNotes: z.string().optional(),
    confidence: z.string().optional(),
    sourceName: z.string().optional(),
    sourceUrl: z.string().optional(),
    sourceFields: z.array(z.string()).optional(),
    needsReview: z.boolean().optional(),
    reviewReason: z.string().optional(),
  }).optional(),
  tankSize: z.string().default(''),
  temperament: z.enum(['Peaceful', 'Aggressive', 'Territorial']),
  size: z.enum(['Small', 'Medium', 'Large']),
  housingMode: z.enum(['适合混养', '谨慎混养', '建议单养']).optional(),
  housingReason: z.string().optional(),
  isCustom: z.boolean().optional(),
});

export const speciesListInputSchema = z.object({
  searchTerm: z.string().optional().default(''),
  lifeType: lifeTypeSchema.optional().default('All'),
  category: z.string().optional().default('全部'),
  includeScenery: z.boolean().optional().default(false),
  limit: z.number().int().positive().max(500).optional().default(500),
});

export const speciesListOutputSchema = z.object({
  items: z.array(fishSchema),
  total: z.number().int().nonnegative(),
});

export const speciesDetailInputSchema = z.object({
  speciesId: z.string().min(1),
});

export const speciesDetailOutputSchema = z.object({
  item: fishSchema.nullable(),
});

export type FishRecord = Fish;
export type SpeciesListInput = z.infer<typeof speciesListInputSchema>;
export interface SpeciesListOutput {
  items: Fish[];
  total: number;
}
export type SpeciesDetailInput = z.infer<typeof speciesDetailInputSchema>;
export interface SpeciesDetailOutput {
  item: Fish | null;
}
