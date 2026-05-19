import { createModuleFailure, createModuleSuccess, ModuleContract } from '../../shared/types/module';
import { RecommendationInput, RecommendationOutput, recommendationInputSchema } from './recommendation.schema';
import { recommendationService } from './recommendation.service';

export const recommendationModule: ModuleContract<RecommendationInput, RecommendationOutput> = {
  name: 'recommendation.recommend',
  run: async (input) => {
    const parsed = recommendationInputSchema.safeParse(input);
    if (!parsed.success) return createModuleFailure('recommendation', 'recommend', 'INVALID_INPUT', '推荐输入不合法', parsed.error.flatten());
    return createModuleSuccess('recommendation', 'recommend', recommendationService.recommend(parsed.data));
  },
};

