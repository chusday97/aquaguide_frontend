import { createModuleFailure, createModuleSuccess, ModuleContract } from '../../shared/types/module';
import {
  AquariumListOutput,
  AquariumReadInput,
  AquariumSaveInput,
  AquariumSaveOutput,
  aquariumReadInputSchema,
  aquariumSaveInputSchema,
} from './aquarium.schema';
import { aquariumService } from './aquarium.service';

export const aquariumListModule: ModuleContract<AquariumReadInput, AquariumListOutput> = {
  name: 'aquarium.list',
  run: async (input) => {
    const parsed = aquariumReadInputSchema.safeParse(input);
    if (!parsed.success) return createModuleFailure('aquarium', 'list', 'INVALID_INPUT', '鱼缸列表输入不合法', parsed.error.flatten());
    return createModuleSuccess('aquarium', 'list', aquariumService.list(parsed.data));
  },
};

export const aquariumSaveModule: ModuleContract<AquariumSaveInput, AquariumSaveOutput> = {
  name: 'aquarium.save',
  run: async (input) => {
    const parsed = aquariumSaveInputSchema.safeParse(input);
    if (!parsed.success) return createModuleFailure('aquarium', 'save', 'INVALID_INPUT', '鱼缸保存输入不合法', parsed.error.flatten());
    const output = aquariumService.save(parsed.data);
    if (!output) return createModuleFailure('aquarium', 'save', 'WRITE_FAILED', '鱼缸保存失败');
    return createModuleSuccess('aquarium', 'save', output);
  },
};

