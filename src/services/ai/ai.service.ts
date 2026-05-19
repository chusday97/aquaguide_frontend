import { askAquaGuideAI, getAiUnavailableMessage } from '../../lib/aiClient';
import { loggerService } from '../logger/logger.service';
import { aiAskInputSchema, aiAskOutputSchema, AiAskOutput } from './ai.schema';

export const aiService = {
  ask: async (input: unknown): Promise<AiAskOutput> => {
    const parsed = aiAskInputSchema.safeParse(input);
    if (!parsed.success) {
      loggerService.warn({
        module: 'ai',
        action: 'ask',
        message: 'AI input failed schema validation',
        details: parsed.error.flatten(),
      });
      return { content: getAiUnavailableMessage() };
    }

    try {
      const systemMessages = parsed.data.messages
        .filter((message) => message.role === 'system')
        .map((message) => message.content);
      const messages = parsed.data.messages
        .filter((message): message is { role: 'user' | 'assistant'; content: string } => message.role === 'user' || message.role === 'assistant');
      const system = [parsed.data.system, ...systemMessages].filter(Boolean).join('\n') || undefined;

      const content = await askAquaGuideAI({
        messages,
        system,
        temperature: parsed.data.temperature,
        maxTokens: parsed.data.maxTokens,
        thinking: parsed.data.thinking,
      });
      const output = aiAskOutputSchema.parse({ content });
      loggerService.info({ module: 'ai', action: 'ask', message: 'AI request completed' });
      return output;
    } catch (error) {
      loggerService.error({ module: 'ai', action: 'ask', message: 'AI request failed', details: error });
      return { content: error instanceof Error ? error.message : getAiUnavailableMessage() };
    }
  },
};
