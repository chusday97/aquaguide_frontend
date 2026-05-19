import { createModuleFailure, createModuleSuccess, ModuleContract } from '../../shared/types/module';
import {
  SpeciesDetailInput,
  SpeciesDetailOutput,
  SpeciesListInput,
  SpeciesListOutput,
  speciesDetailInputSchema,
  speciesListInputSchema,
} from './species.schema';
import { speciesService } from './species.service';

export const speciesListModule: ModuleContract<SpeciesListInput, SpeciesListOutput> = {
  name: 'species.list',
  run: async (input) => {
    const parsed = speciesListInputSchema.safeParse(input);
    if (!parsed.success) return createModuleFailure('species', 'list', 'INVALID_INPUT', '物种列表输入不合法', parsed.error.flatten());
    return createModuleSuccess('species', 'list', speciesService.list(parsed.data));
  },
};

export const speciesDetailModule: ModuleContract<SpeciesDetailInput, SpeciesDetailOutput> = {
  name: 'species.detail',
  run: async (input) => {
    const parsed = speciesDetailInputSchema.safeParse(input);
    if (!parsed.success) return createModuleFailure('species', 'detail', 'INVALID_INPUT', '物种详情输入不合法', parsed.error.flatten());
    return createModuleSuccess('species', 'detail', speciesService.detail(parsed.data));
  },
};

