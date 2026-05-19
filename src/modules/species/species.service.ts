import { fishData } from '../../data/fishData';
import { isAquaticPlantSpecies, isHardscapeSpecies } from '../../lib/speciesClassification';
import { loggerService } from '../../services/logger/logger.service';
import { Fish } from '../../types';
import { speciesDetailInputSchema, speciesListInputSchema, SpeciesDetailOutput, SpeciesListOutput } from './species.schema';

const getLifeType = (fish: Fish) => {
  if (fish.category === '水草') return isHardscapeSpecies(fish) ? 'hardscape' : 'plant';
  if (fish.category === '硬景/底床') return 'hardscape';
  if (isAquaticPlantSpecies(fish)) return 'plant';
  if (isHardscapeSpecies(fish)) return 'hardscape';
  if (fish.category === '珊瑚/海水无脊椎') return 'coral';
  if (fish.category === '虾螺蟹' || fish.category === '虾类' || fish.category === '螺类') return 'invertebrate';
  if (fish.category === '龟类' || fish.category === '两栖/爬宠') return 'reptile';
  return 'fish';
};

export const speciesService = {
  list: (input: unknown): SpeciesListOutput => {
    const parsed = speciesListInputSchema.safeParse(input);
    if (!parsed.success) {
      loggerService.warn({
        module: 'species',
        action: 'list',
        message: 'Species list input failed schema validation',
        details: parsed.error.flatten(),
      });
      return { items: [], total: 0 };
    }

    const { searchTerm, lifeType, category, limit } = parsed.data;
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const items = fishData
      .filter((fish) => lifeType === 'All' || getLifeType(fish) === lifeType)
      .filter((fish) => category === '全部' || fish.category === category)
      .filter((fish) => {
        if (!normalizedSearch) return true;
        return fish.name.toLowerCase().includes(normalizedSearch) || fish.scientificName.toLowerCase().includes(normalizedSearch);
      })
      .slice(0, limit);

    loggerService.info({ module: 'species', action: 'list', message: 'Species list generated', details: { total: items.length } });
    return { items, total: items.length };
  },

  detail: (input: unknown): SpeciesDetailOutput => {
    const parsed = speciesDetailInputSchema.safeParse(input);
    if (!parsed.success) {
      loggerService.warn({
        module: 'species',
        action: 'detail',
        message: 'Species detail input failed schema validation',
        details: parsed.error.flatten(),
      });
      return { item: null };
    }

    const item = fishData.find((fish) => fish.id === parsed.data.speciesId) || null;
    loggerService.info({ module: 'species', action: 'detail', message: 'Species detail read', details: { speciesId: parsed.data.speciesId } });
    return { item };
  },
};

