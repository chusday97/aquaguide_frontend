import { z } from 'zod';
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
});

export const recommendationOutputSchema = z.object({
  items: z.array(recommendationItemSchema),
});

export type RecommendationInput = z.infer<typeof recommendationInputSchema>;
export type RecommendationItem = z.infer<typeof recommendationItemSchema>;
export type RecommendationOutput = z.infer<typeof recommendationOutputSchema>;

