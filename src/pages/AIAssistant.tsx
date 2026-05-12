import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { fishData } from '../data/fishData';
import { Crown, Sparkles } from 'lucide-react';
import { askAquaGuideAI } from '../lib/aiClient';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "新手适合养什么鱼？",
  "鱼缸水质变浑浊怎么办？",
  "孔雀鱼怎么繁殖？",
  "新鱼入缸需要注意什么？"
];

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '你好！我是你的养鱼助手。无论你是想了解某种鱼的饲养条件，还是遇到了水质问题，都可以问我。'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
      const responseText = await askAquaGuideAI({
        messages: [...messages, userMessage].map(msg => ({ role: msg.role, content: msg.content })),
        maxTokens: 1200,
        temperature: 0.35,
        system: `你是一个专业的水族专家和养殖助手。你的任务是回答用户关于养鱼、水族箱管理、水质、鱼类疾病等方面的问题。如果用户询问鱼类名，请在文件中查找对应的 pH、温度和混养建议。如果数据库中不存在该鱼类，请明确告知用户。
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
    <div className="mx-auto flex h-[calc(100vh-10rem)] min-w-0 max-w-3xl flex-col overflow-x-hidden md:h-[calc(100vh-5rem)]">
      <header className="mb-4 md:mb-6">
        <h1 className="font-serif text-3xl md:text-4xl leading-[1.1] mb-1 md:mb-2 text-ink font-bold">AI 养鱼助手</h1>
        <p className="text-ink/80 text-xs md:text-sm font-medium">有任何养鱼方面的问题？随时问我！</p>
      </header>
      
      <div className="flex-1 flex flex-col bg-white border border-border p-3 md:p-6 overflow-hidden">
        <ScrollArea className="flex-1 pr-3 md:pr-4" ref={scrollRef}>
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`text-xs md:text-[13px] leading-[1.6] ${message.role === 'user' ? 'text-ink font-medium' : 'text-accent font-bold'}`}
              >
                <span className="text-ink/60 mr-2 font-bold">{message.role === 'user' ? '问：' : '答：'}</span>
                {message.content}
              </div>
            ))}
            {isLoading && (
              <div className="text-xs md:text-[13px] italic text-ink/60 border-t border-border mt-2 pt-2 font-medium">
                AI 正在为您分析当前鱼缸环境...
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="mt-3 md:mt-4 flex flex-col gap-2">
          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 mb-1">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  disabled={isLoading}
                  className="text-[11px] md:text-xs bg-bg border border-border hover:border-accent hover:text-accent text-ink/80 px-3 py-1.5 rounded-sm transition-colors font-medium flex items-center"
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
              className="flex-1 rounded-none border-border text-xs p-2.5 md:p-3 h-auto shadow-none focus-visible:ring-1 focus-visible:ring-accent text-ink placeholder:text-ink/50 font-medium"
            />
            <Button type="submit" disabled={!input.trim() || isLoading} className="rounded-none bg-accent hover:bg-accent/90 text-white h-auto px-4 md:px-6 text-xs md:text-sm font-bold">
              发送
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
