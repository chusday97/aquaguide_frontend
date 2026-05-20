import { loggerService } from '../../services/logger/logger.service';
import { Fish } from '../../types';
import {
  getDisplayableSpecies,
  getLifeType,
  getLifeTypeCounts,
  getSecondaryCategories,
  matchesWaterTypeFilter,
} from '../species/species.service';
import { encyclopediaSearchInputSchema, EncyclopediaSearchOutput } from './encyclopedia.schema';

const defaultOutput: EncyclopediaSearchOutput = {
  items: [],
  allItems: [],
  categorySourceItems: [],
  categories: [],
  lifeTypeCounts: {},
  total: 0,
  activeFilters: { searchTerm: '', lifeType: 'All', category: '全部', difficulty: 'All', waterType: 'All', housingMode: 'All' },
};

const matchesBaseFilters = (fish: Fish, filters: EncyclopediaSearchOutput['activeFilters']) => {
  const normalizedSearch = filters.searchTerm.trim().toLowerCase();
  const matchesSearch = !normalizedSearch
    || fish.name.toLowerCase().includes(normalizedSearch)
    || fish.scientificName.toLowerCase().includes(normalizedSearch);
  const matchesDifficulty = filters.difficulty === 'All' || fish.difficulty === filters.difficulty;
  const matchesLifeType = filters.lifeType === 'All' || getLifeType(fish) === filters.lifeType;
  const matchesWaterType = matchesWaterTypeFilter(fish, filters.waterType);
  const matchesHousing = filters.housingMode === 'All' || (fish.housingMode || '适合混养') === filters.housingMode;

  return matchesSearch && matchesDifficulty && matchesLifeType && matchesWaterType && matchesHousing;
};

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
      return defaultOutput;
    }

    const activeFilters = {
      searchTerm: parsed.data.searchTerm,
      lifeType: parsed.data.lifeType,
      category: parsed.data.category,
      difficulty: parsed.data.difficulty,
      waterType: parsed.data.waterType,
      housingMode: parsed.data.housingMode,
    };
    const allItems = getDisplayableSpecies();
    const categorySourceItems = allItems.filter((fish) => matchesBaseFilters(fish, activeFilters));
    const categories = getSecondaryCategories(categorySourceItems, parsed.data.lifeType);
    const items = categorySourceItems
      .filter((fish) => parsed.data.category === '全部' || fish.category === parsed.data.category)
      .slice(0, parsed.data.limit);

    loggerService.info({ module: 'encyclopedia', action: 'search', message: 'Encyclopedia search completed', details: { total: items.length } });
    return {
      items,
      allItems,
      categorySourceItems,
      categories,
      lifeTypeCounts: getLifeTypeCounts(allItems, ['fish', 'invertebrate', 'reptile', 'coral']),
      total: items.length,
      activeFilters,
    };
  },
};
