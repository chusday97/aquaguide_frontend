import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fishData } from '../data/fishData';
import { Sparkles, Trash2 } from 'lucide-react';
import { askAquaGuideAI } from '../lib/aiClient';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface StructuredAnswer {
  conclusion: string;
  reasons: string[];
  actions: string[];
  askNext?: string;
}

const SUGGESTED_QUESTIONS = [
  "新手适合养什么鱼？",
  "鱼缸水质变浑浊怎么办？",
  "孔雀鱼怎么繁殖？",
  "新鱼入缸需要注意什么？"
];

const CHAT_STORAGE_KEY = 'aquaguide_ai_chat_messages';

const welcomeMessage: Message = {
  id: 'welcome',
  role: 'assistant',
  content: '你好！我是你的养鱼助手。无论你是想了解某种鱼的饲养条件，还是遇到了水质问题，都可以问我。'
};

const loadSavedMessages = () => {
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!saved) return [welcomeMessage];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) return [welcomeMessage];
    return parsed.filter((message): message is Message =>
      typeof message?.id === 'string' &&
      (message.role === 'user' || message.role === 'assistant') &&
      typeof message.content === 'string'
    );
  } catch {
    return [welcomeMessage];
  }
};

const parseStructuredAnswer = (content: string): StructuredAnswer | null => {
  const normalized = content.trim();
  if (!normalized) return null;

  const conclusion = normalized.match(/(?:结论|建议)[:：]\s*([\s\S]*?)(?=\n(?:原因|理由|下一步|操作|追问|建议追问)[:：]|$)/)?.[1]?.trim();
  const reasonsBlock = normalized.match(/(?:原因|理由)[:：]\s*([\s\S]*?)(?=\n(?:下一步|操作|追问|建议追问)[:：]|$)/)?.[1]?.trim();
  const actionsBlock = normalized.match(/(?:下一步|操作)[:：]\s*([\s\S]*?)(?=\n(?:追问|建议追问)[:：]|$)/)?.[1]?.trim();
  const askNext = normalized.match(/(?:追问|建议追问)[:：]\s*([\s\S]*?)$/)?.[1]?.trim();

  if (!conclusion && !reasonsBlock && !actionsBlock) return null;

  const toList = (block?: string) => (block || '')
    .split(/\n|；|;/)
    .map(item => item.replace(/^[-*•\d.、\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 4);

  return {
    conclusion: conclusion || normalized.split('\n')[0],
    reasons: toList(reasonsBlock).slice(0, 3),
    actions: toList(actionsBlock).slice(0, 4),
    askNext,
  };
};

function AssistantAnswer({ content }: { content: string }) {
  const structured = parseStructuredAnswer(content);

  if (!structured) {
    return <span>{content}</span>;
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 text-[10px] font-black uppercase tracking-[1px] text-accent/70">结论</div>
        <p className="text-[14px] font-black leading-relaxed text-accent">{structured.conclusion}</p>
      </div>

      {structured.reasons.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] font-black uppercase tracking-[1px] text-ink/45">为什么</div>
          <ul className="space-y-1.5">
            {structured.reasons.map((reason, index) => (
              <li key={`${reason}-${index}`} className="grid grid-cols-[16px_1fr] gap-1.5 text-[12px] font-medium leading-relaxed text-ink/75">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent/60" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {structured.actions.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] font-black uppercase tracking-[1px] text-ink/45">下一步</div>
          <div className="space-y-1.5">
            {structured.actions.map((action, index) => (
              <div key={`${action}-${index}`} className="rounded-sm border border-accent/15 bg-white/70 px-2.5 py-2 text-[12px] font-bold leading-relaxed text-ink">
                {index + 1}. {action}
              </div>
            ))}
          </div>
        </div>
      )}

      {structured.askNext && (
        <div className="rounded-full bg-accent/10 px-3 py-2 text-[11px] font-bold text-accent">
          可以继续问：{structured.askNext}
        </div>
      )}
    </div>
  );
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>(loadSavedMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-80)));
  }, [messages]);

  const handleClearChat = () => {
    if (!confirm('确定要清空 AI 助手的历史对话吗？')) return;
    setMessages([welcomeMessage]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  const handleSend = async (textToSubmit?: string) => {
    const text = textToSubmit || input;
    if (!text.trim() || isLoading) return;

    localStorage.setItem('ai_queries_count', ((parseInt(localStorage.getItem('ai_queries_count') || '0', 10)) + 1).toString());

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    if (!textToSubmit) setInput('');
    setIsLoading(true);

    try {
      const recentMessages = [...messages, userMessage].slice(-12);
      const responseText = await askAquaGuideAI({
        messages: recentMessages.map(msg => ({ role: msg.role, content: msg.content })),
        maxTokens: 650,
        temperature: 0.25,
        system: `你是一个专业的水族专家和养殖助手。你的任务是回答用户关于养鱼、水族箱管理、水质、鱼类疾病等方面的问题。如果用户询问鱼类名，请在文件中查找对应的 pH、温度和混养建议。如果数据库中不存在该鱼类，请明确告知用户。
请始终使用简短、结构化、可执行的手机端回答，不要输出长篇说明。
必须按以下格式回答，标题不可改名：
结论：一句话回答，最多35个中文字符。
原因：
- 最多3条，每条不超过28个中文字符。
下一步：
- 给用户2-4个具体动作，每条不超过30个中文字符。
追问：给一个用户可以继续点击/输入的问题，最多25个中文字符。
如果信息不足，先给安全建议，再在“追问”里问最关键的一个补充问题。
请优先基于以下本地水族数据库中的信息进行回答：
${JSON.stringify(fishData.map(f => ({name: f.name, sci: f.scientificName, temp: f.waterTemperature, ph: f.phLevel, diff: f.difficulty, size: f.size, category: f.category, temperament: f.temperament, tankSize: f.tankSize, waterChangeCycle: f.waterChangeCycle, description: f.description})))}
如果用户问了与水族、养鱼无关的问题，请礼貌地引导回养鱼的话题。`,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText || '抱歉，我没有理解你的问题。'
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error instanceof Error ? error.message : 'AI 请求失败。请检查 DeepSeek API Key、余额或网络连接。'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-150px)] min-w-0 max-w-full flex-col overflow-x-hidden">
      <header className="mb-4 flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="mb-1 font-serif text-[34px] font-bold leading-tight text-ink">AI 养鱼助手</h1>
          <p className="text-xs font-medium text-ink/80">会记住本机里的历史对话，继续追问也能接上上下文。</p>
        </div>
        {messages.length > 1 && (
          <button
            type="button"
            onClick={handleClearChat}
            className="mt-1 inline-flex h-9 shrink-0 items-center rounded-sm border border-border bg-white px-2 text-[11px] font-bold text-ink/60 hover:text-red-500"
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            清空
          </button>
        )}
      </header>
      
      <div className="flex min-h-[560px] flex-1 flex-col overflow-hidden border border-border bg-white p-3">
        <ScrollArea className="flex-1 pr-2" ref={scrollRef}>
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`rounded-sm px-3 py-2 text-[13px] leading-[1.65] ${
                  message.role === 'user'
                    ? 'ml-8 border border-border bg-bg text-ink font-medium'
                    : 'mr-8 border border-accent/10 bg-accent-light/60 text-accent font-bold'
                }`}
              >
                {message.role === 'user' ? (
                  <>
                    <span className="mr-2 font-bold text-ink/60">问：</span>
                    {message.content}
                  </>
                ) : (
                  <AssistantAnswer content={message.content} />
                )}
              </div>
            ))}
            {isLoading && (
              <div className="mt-2 border-t border-border pt-2 text-[13px] italic text-ink/60 font-medium">
                AI 正在为您分析当前鱼缸环境...
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="mt-3 flex flex-col gap-2">
          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 mb-1">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  disabled={isLoading}
                  className="flex items-center rounded-sm border border-border bg-bg px-3 py-1.5 text-[11px] font-medium text-ink/80 transition-colors hover:border-accent hover:text-accent"
                >
                  <Sparkles className="w-3 h-3 mr-1 opacity-50" />
                  {q}
                </button>
              ))}
            </div>
          )}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入您的问题..."
              disabled={isLoading}
              className="h-auto flex-1 rounded-none border-border p-2.5 text-xs font-medium text-ink shadow-none placeholder:text-ink/50 focus-visible:ring-1 focus-visible:ring-accent"
            />
            <Button type="submit" disabled={!input.trim() || isLoading} className="h-auto rounded-none bg-accent px-4 text-xs font-bold text-white hover:bg-accent/90">
              发送
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
