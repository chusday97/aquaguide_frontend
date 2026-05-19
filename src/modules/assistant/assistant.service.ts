import { aiService } from '../../services/ai/ai.service';
import { loggerService } from '../../services/logger/logger.service';
import { assistantAskInputSchema, AssistantAskOutput } from './assistant.schema';

const assistantSystemPrompt = [
  '你是 AquaGuide 的水族助手。',
  '回答必须简短、有结构，优先给用户下一步可执行建议。',
  '不要大段输出；如涉及风险，请明确写出原因和处理步骤。',
].join('\n');

export const assistantService = {
  ask: async (input: unknown): Promise<AssistantAskOutput> => {
    const parsed = assistantAskInputSchema.safeParse(input);
    if (!parsed.success) {
      loggerService.warn({
        module: 'assistant',
        action: 'ask',
        message: 'Assistant ask input failed schema validation',
        details: parsed.error.flatten(),
      });
      return { answer: '问题内容为空，请先输入你想咨询的养鱼问题。', mentionedSpeciesIds: [], suggestedActions: [] };
    }

    const content = [
      parsed.data.context?.aquariumSummary ? `鱼缸上下文：${parsed.data.context.aquariumSummary}` : '',
      `用户问题：${parsed.data.question}`,
    ].filter(Boolean).join('\n');

    const response = await aiService.ask({
      system: assistantSystemPrompt,
      messages: [{ role: 'user', content }],
      temperature: 0.3,
      maxTokens: 900,
      thinking: 'disabled',
    });

    loggerService.info({ module: 'assistant', action: 'ask', message: 'Assistant answer generated' });
    return {
      answer: response.content,
      mentionedSpeciesIds: parsed.data.context?.selectedSpeciesIds || [],
      suggestedActions: [],
    };
  },
};

