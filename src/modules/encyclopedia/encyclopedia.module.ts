import { createModuleFailure, createModuleSuccess, ModuleContract } from '../../shared/types/module';
import { EncyclopediaSearchInput, EncyclopediaSearchOutput, encyclopediaSearchInputSchema } from './encyclopedia.schema';
import { encyclopediaService } from './encyclopedia.service';

export const encyclopediaSearchModule: ModuleContract<EncyclopediaSearchInput, EncyclopediaSearchOutput> = {
  name: 'encyclopedia.search',
  run: async (input) => {
    const parsed = encyclopediaSearchInputSchema.safeParse(input);
    if (!parsed.success) return createModuleFailure('encyclopedia', 'search', 'INVALID_INPUT', '图鉴搜索输入不合法', parsed.error.flatten());
    return createModuleSuccess('encyclopedia', 'search', encyclopediaService.search(parsed.data));
  },
};

