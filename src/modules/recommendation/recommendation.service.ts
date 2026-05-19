import { loggerService } from '../../services/logger/logger.service';
import { recommendationInputSchema, RecommendationOutput } from './recommendation.schema';

export const recommendationService = {
  recommend: (input: unknown): RecommendationOutput => {
    const parsed = recommendationInputSchema.safeParse(input);
    if (!parsed.success) {
      loggerService.warn({
        module: 'recommendation',
        action: 'recommend',
        message: 'Recommendation input failed schema validation',
        details: parsed.error.flatten(),
      });
      return { items: [] };
    }

    const existingIds = new Set(parsed.data.aquarium.fishes.map((item) => item.fishId));
    const items = parsed.data.speciesPool
      .filter((species) => !existingIds.has(species.id))
      .filter((species) => species.housingMode !== '建议单养')
      .slice(0, parsed.data.limit)
      .map((species) => ({
        speciesId: species.id,
        reason: '与当前鱼缸进行基础兼容筛选后推荐，后续会接入更完整的风险算法。',
        confidence: 'medium' as const,
      }));

    loggerService.info({ module: 'recommendation', action: 'recommend', message: 'Recommendation generated', details: { count: items.length } });
    return { items };
  },
};

