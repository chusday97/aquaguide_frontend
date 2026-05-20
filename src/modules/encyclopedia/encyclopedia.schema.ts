import { z } from 'zod';
import type { Fish } from '../../types';
import { fishSchema } from '../species/species.schema';

export const encyclopediaSearchInputSchema = z.object({
  searchTerm: z.string().default(''),
  lifeType: z.enum(['All', 'fish', 'invertebrate', 'reptile', 'coral']).default('All'),
  category: z.string().default('全部'),
  difficulty: z.enum(['All', 'Easy', 'Medium', 'Hard']).default('All'),
  waterType: z.enum(['All', 'Freshwater', 'Saltwater', 'Coldwater']).default('All'),
  housingMode: z.enum(['All', '适合混养', '谨慎混养', '建议单养']).default('All'),
  limit: z.number().int().positive().max(500).default(500),
});

export const encyclopediaSearchOutputSchema = z.object({
  items: z.array(fishSchema),
  allItems: z.array(fishSchema),
  categorySourceItems: z.array(fishSchema),
  categories: z.array(z.string()),
  lifeTypeCounts: z.record(z.string(), z.number().int().nonnegative()),
  total: z.number().int().nonnegative(),
  activeFilters: z.object({
    searchTerm: z.string(),
    lifeType: z.string(),
    category: z.string(),
    difficulty: z.string(),
    waterType: z.string(),
    housingMode: z.string(),
  }),
});

export type EncyclopediaSearchInput = z.infer<typeof encyclopediaSearchInputSchema>;
export interface EncyclopediaSearchOutput {
  items: Fish[];
  allItems: Fish[];
  categorySourceItems: Fish[];
  categories: string[];
  lifeTypeCounts: Record<string, number>;
  total: number;
  activeFilters: {
    searchTerm: string;
    lifeType: string;
    category: string;
    difficulty: string;
    waterType: string;
    housingMode: string;
  };
}
