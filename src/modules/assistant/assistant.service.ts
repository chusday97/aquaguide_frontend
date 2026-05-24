import { aiService } from '../../services/ai/ai.service';
import { loggerService } from '../../services/logger/logger.service';
import { fishData } from '../../data/fishData';
import { assistantAskInputSchema, AssistantAskOutput } from './assistant.schema';

const assistantSystemPrompt = [
  '你是 AquaGuide 的专业水族助手。',
  '回答必须适合手机端阅读：短、分块、有行动指引。',
  '必须按以下格式回答，标题不可改名：',
  '结论：一句话回答，最多35个中文字符。',
  '原因：最多3条，每条不超过28个中文字符。',
  '下一步：给2-4个具体动作，每条不超过30个中文字符。',
  '追问：给一个用户可以继续问的问题，最多25个中文字符。',
  '如果信息不足，先给安全建议，再在“追问”里问最关键的一个补充问题。',
  '如果用户问了与水族无关的问题，请礼貌引导回养鱼话题。',
].join('\n');

const compactSpeciesContext = JSON.stringify(
  fishData.map(fish => ({
    id: fish.id,
    name: fish.name,
    sci: fish.scientificName,
    temp: fish.waterTemperature,
    ph: fish.phLevel,
    diff: fish.difficulty,
    size: fish.size,
    category: fish.category,
    temperament: fish.temperament,
    tankSize: fish.tankSize,
    housing: fish.housingMode,
    diet: fish.feedingProfile?.recommendedFoods || fish.diet,
  })),
);

const findMentionedSpeciesIds = (text: string) => {
  const normalized = text.toLowerCase();
  return fishData
    .filter(fish => normalized.includes(fish.name.toLowerCase()) || normalized.includes(fish.scientificName.toLowerCase()))
    .slice(0, 6)
    .map(fish => fish.id);
};

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
      `本地水族数据库：${compactSpeciesContext}`,
      `用户问题：${parsed.data.question}`,
    ].filter(Boolean).join('\n');

    const response = await aiService.ask({
      system: assistantSystemPrompt,
      messages: [
        ...parsed.data.history.slice(-10),
        { role: 'user' as const, content },
      ],
      temperature: 0.25,
      maxTokens: 650,
      thinking: 'disabled',
    });

    const mentionedSpeciesIds = Array.from(new Set([
      ...(parsed.data.context?.selectedSpeciesIds || []),
      ...findMentionedSpeciesIds(`${parsed.data.question}\n${response.content}`),
    ])).slice(0, 6);

    loggerService.info({ module: 'assistant', action: 'ask', message: 'Assistant answer generated' });
    return {
      answer: response.content,
      mentionedSpeciesIds,
      suggestedActions: mentionedSpeciesIds.map(speciesId => {
        const species = fishData.find(fish => fish.id === speciesId);
        return {
          type: 'add_to_wishlist' as const,
          label: species ? `种草 ${species.name}` : '加入种草',
          speciesId,
        };
      }),
    };
  },
};
