import { loggerService } from '../../services/logger/logger.service';
import { speciesService } from '../species/species.service';
import { encyclopediaSearchInputSchema, EncyclopediaSearchOutput } from './encyclopedia.schema';

export const encyclopediaService = {
  search: (input: unknown): EncyclopediaSearchOutput => {
    const parsed = encyclopediaSearchInputSchema.safeParse(input);
    if (!parsed.success) {
      loggerService.warn({
        module: 'encyclopedia',
        action: 'search',
        message: 'Encyclopedia search input failed schema validation',
        details: parsed.error.flatten(),
      });
      return { items: [], total: 0, activeFilters: { searchTerm: '', lifeType: 'All', category: '全部', difficulty: 'All' } };
    }

    const result = speciesService.list(parsed.data);
    const items = parsed.data.difficulty === 'All'
      ? result.items
      : result.items.filter((fish) => fish.difficulty === parsed.data.difficulty);

    loggerService.info({ module: 'encyclopedia', action: 'search', message: 'Encyclopedia search completed', details: { total: items.length } });
    return {
      items,
      total: items.length,
      activeFilters: {
        searchTerm: parsed.data.searchTerm,
        lifeType: parsed.data.lifeType,
        category: parsed.data.category,
        difficulty: parsed.data.difficulty,
      },
    };
  },
};

