import { createModuleFailure, createModuleSuccess, ModuleContract } from '../../shared/types/module';
import { AssistantAskInput, AssistantAskOutput, assistantAskInputSchema } from './assistant.schema';
import { assistantService } from './assistant.service';

export const assistantAskModule: ModuleContract<AssistantAskInput, AssistantAskOutput> = {
  name: 'assistant.ask',
  run: async (input) => {
    const parsed = assistantAskInputSchema.safeParse(input);
    if (!parsed.success) return createModuleFailure('assistant', 'ask', 'INVALID_INPUT', 'AI 助手输入不合法', parsed.error.flatten());
    return createModuleSuccess('assistant', 'ask', await assistantService.ask(parsed.data));
  },
};

