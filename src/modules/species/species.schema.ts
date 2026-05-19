import { z } from 'zod';

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
  lifeType: z.enum(['All', 'fish', 'invertebrate', 'reptile', 'coral']).optional().default('All'),
  category: z.string().optional().default('全部'),
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

export type FishRecord = z.infer<typeof fishSchema>;
export type SpeciesListInput = z.infer<typeof speciesListInputSchema>;
export type SpeciesListOutput = z.infer<typeof speciesListOutputSchema>;
export type SpeciesDetailInput = z.infer<typeof speciesDetailInputSchema>;
export type SpeciesDetailOutput = z.infer<typeof speciesDetailOutputSchema>;

