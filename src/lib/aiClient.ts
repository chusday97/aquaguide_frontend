export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AskAiOptions {
  messages: AiMessage[];
  system?: string;
  temperature?: number;
  maxTokens?: number;
  thinking?: 'enabled' | 'disabled';
}

export const getAiUnavailableMessage = () => (
  'AI 后端还没有配置 DeepSeek API Key。请在项目根目录创建 .env.local，并写入 DEEPSEEK_API_KEY=你的Key，然后重启 npm run dev。'
);

export const askAquaGuideAI = async ({
  messages,
  system,
  temperature = 0.4,
  maxTokens = 1200,
  thinking = 'disabled',
}: AskAiOptions) => {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, system, temperature, maxTokens, thinking }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || getAiUnavailableMessage());
  }

  return String(data.content || '');
};
