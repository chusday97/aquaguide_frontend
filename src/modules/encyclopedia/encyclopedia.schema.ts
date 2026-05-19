import { z } from 'zod';
import { fishSchema } from '../species/species.schema';

export const encyclopediaSearchInputSchema = z.object({
  searchTerm: z.string().default(''),
  lifeType: z.enum(['All', 'fish', 'invertebrate', 'reptile', 'coral']).default('All'),
  category: z.string().default('全部'),
  difficulty: z.enum(['All', 'Easy', 'Medium', 'Hard']).default('All'),
  limit: z.number().int().positive().max(500).default(100),
});

export const encyclopediaSearchOutputSchema = z.object({
  items: z.array(fishSchema),
  total: z.number().int().nonnegative(),
  activeFilters: z.object({
    searchTerm: z.string(),
    lifeType: z.string(),
    category: z.string(),
    difficulty: z.string(),
  }),
});

export type EncyclopediaSearchInput = z.infer<typeof encyclopediaSearchInputSchema>;
export type EncyclopediaSearchOutput = z.infer<typeof encyclopediaSearchOutputSchema>;

