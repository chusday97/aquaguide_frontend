import { useMemo, useState } from 'react';
import { AlertTriangle, Baby, ChevronRight, Droplets, HeartPulse, Search, Skull, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CompatibilityRiskCalculator } from '../components/CompatibilityRiskCalculator';

type CareTopic = {
  id: string;
  title: string;
  category: string;
  urgency: '日常' | '尽快处理' | '高优先级';
  icon: typeof Droplets;
  summary: string;
  symptoms: string[];
  firstSteps: string[];
  avoid: string[];
  nextStep: string;
  imageLabel: string;
  tone: string;
};

const categories = ['全部', '水质', '繁殖', '鱼苗', '换水', '死亡处理'];

const careTopics: CareTopic[] = [
  {
    id: 'water-quality',
    title: '水质变差怎么办',
    category: '水质',
    urgency: '高优先级',
    icon: Waves,
    summary: '适合鱼浮头、浑水、异味、突然趴缸等情况的快速排查。',
    symptoms: ['水体发白或发绿', '鱼频繁浮头、急游或趴缸', '缸内有明显腥臭味', '过滤棉很脏或近期喂食过量'],
    firstSteps: ['先停止喂食 12-24 小时', '少量多次换水，每次 20%-30%', '检查过滤是否正常出水', '增加打氧，观察鱼的呼吸状态'],
    avoid: ['不要一次性全缸换水', '不要同时大量下药和清洗滤材', '不要把滤材用自来水直接冲洗'],
    nextStep: '下一步补充氨氮、亚硝酸盐、pH 和温度数据，系统可以继续判断是硝化崩溃、缺氧还是有机物过量。',
    imageLabel: '预留水质对比图',
    tone: 'from-sky-50 to-cyan-50 border-sky-100 text-sky-700',
  },
  {
    id: 'pregnant-fish',
    title: '母鱼怀孕护理',
    category: '繁殖',
    urgency: '尽快处理',
    icon: HeartPulse,
    summary: '适合孔雀鱼、玛丽、月光等卵胎生鱼临产前后的护理。',
    symptoms: ['腹部明显膨大', '胎斑变深', '常躲在角落或水草后', '食欲下降、临近生产'],
    firstSteps: ['准备隔离盒或繁殖缸', '保持水温稳定，避免追逐惊吓', '少量多餐，提供高蛋白饲料', '放入莫斯或细叶水草给鱼苗躲避'],
    avoid: ['不要频繁捞鱼刺激母鱼', '不要把母鱼长期关在过小隔离盒', '不要在临产期大幅换水'],
    nextStep: '下一步记录鱼种、腹部照片、预计生产时间和缸内同伴，判断是否需要隔离。',
    imageLabel: '预留母鱼状态图',
    tone: 'from-rose-50 to-pink-50 border-rose-100 text-rose-600',
  },
  {
    id: 'fry-care',
    title: '鱼苗照料',
    category: '鱼苗',
    urgency: '尽快处理',
    icon: Baby,
    summary: '适合刚出生鱼苗的开口、保温、躲避和换水管理。',
    symptoms: ['鱼苗贴边或聚在水面', '不会主动抢食', '体型差异越来越大', '被成鱼追咬或吞食'],
    firstSteps: ['隔离鱼苗或提供密集水草躲避', '少量多次投喂细颗粒、丰年虾或蛋黄水', '每天清理残饵，保持水体稳定', '换水用同温困水，动作要轻'],
    avoid: ['不要一次投喂太多粉料', '不要让强水流直接冲鱼苗', '不要和大鱼长期混养'],
    nextStep: '下一步根据鱼苗大小、数量和饲料类型，规划前 7 天喂养频率。',
    imageLabel: '预留鱼苗喂养图',
    tone: 'from-amber-50 to-yellow-50 border-amber-100 text-amber-700',
  },
  {
    id: 'water-change',
    title: '怎么安全换水',
    category: '换水',
    urgency: '日常',
    icon: Droplets,
    summary: '适合新手建立固定换水流程，减少温差、氯气和水质波动。',
    symptoms: ['水体轻微发黄', '缸壁藻多', '硝酸盐累积', '鱼缸需要周期维护'],
    firstSteps: ['提前困水或使用除氯剂', '新水温度尽量接近缸内水温', '常规每次换 20%-30%', '换水后观察鱼是否急游或浮头'],
    avoid: ['不要直接加入大量冷水', '不要换水时翻动太多底床', '不要把滤材和换水大清洗放在同一天'],
    nextStep: '下一步可以结合鱼缸大小、生物数量和过滤强度，生成换水周期提醒。',
    imageLabel: '预留换水步骤图',
    tone: 'from-emerald-50 to-teal-50 border-emerald-100 text-emerald-700',
  },
  {
    id: 'fish-death',
    title: '鱼死了以后怎么处理',
    category: '死亡处理',
    urgency: '高优先级',
    icon: Skull,
    summary: '适合发现死鱼后的隔离、排查和防止连锁死亡。',
    symptoms: ['单条或多条突然死亡', '尸体有白毛、烂鳍或腹胀', '其他鱼开始浮头或躲藏', '近期新鱼入缸或换水较大'],
    firstSteps: ['立即捞出死鱼并记录时间', '观察其他鱼是否有异常', '少量换水并加强打氧', '回顾最近 72 小时的新鱼、喂食、换水和用药'],
    avoid: ['不要立刻全缸猛下药', '不要忽略连续死亡的水质风险', '不要把病鱼尸体留在缸内'],
    nextStep: '下一步记录死亡鱼种、数量、照片和水质指标，判断是传染、应激还是水质事故。',
    imageLabel: '预留异常排查图',
    tone: 'from-slate-50 to-zinc-50 border-slate-200 text-slate-700',
  },
];

export default function CareEncyclopedia() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');
  const [selectedTopic, setSelectedTopic] = useState<CareTopic | null>(null);

  const filteredTopics = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return careTopics.filter(topic => {
      const matchesCategory = activeCategory === '全部' || topic.category === activeCategory;
      const matchesKeyword = !keyword || [
        topic.title,
        topic.category,
        topic.summary,
        ...topic.symptoms,
        ...topic.firstSteps,
      ].some(text => text.toLowerCase().includes(keyword));
      return matchesCategory && matchesKeyword;
    });
  }, [activeCategory, searchTerm]);

  return (
    <div className="flex min-w-0 flex-col gap-4 overflow-x-hidden">
      <CompatibilityRiskCalculator />

      <section className="rounded-sm border border-border bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-serif text-2xl font-bold italic leading-tight text-ink">养护百科</h1>
            <p className="mt-1 text-[12px] font-medium leading-relaxed text-ink/58">
              把高频养鱼问题整理成可查阅的专题，先判断，再处理。
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-sky-100 bg-sky-50 text-sky-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

        <div className="relative mt-4">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/45" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="搜索水质、怀孕、鱼苗、换水..."
            className="h-9 rounded-sm border-border bg-bg pl-8 text-[12px] font-medium text-ink placeholder:text-ink/40"
          />
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map(category => {
          const isActive = activeCategory === category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`shrink-0 rounded-sm border px-3 py-2 text-[12px] font-bold transition-colors ${
                isActive ? 'border-accent bg-accent text-white' : 'border-border bg-white text-ink/70 hover:border-accent hover:text-accent'
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      <section className="grid gap-3">
        {filteredTopics.map(topic => {
          const Icon = topic.icon;
          return (
            <button
              key={topic.id}
              type="button"
              onClick={() => setSelectedTopic(topic)}
              className={`overflow-hidden rounded-sm border bg-gradient-to-br text-left shadow-sm transition-transform active:scale-[0.99] ${topic.tone}`}
            >
              <div className="grid grid-cols-[92px_1fr_auto] gap-3 p-3">
                <div className="flex h-[92px] items-center justify-center rounded-sm border border-current/10 bg-white/65">
                  <div className="text-center">
                    <Icon className="mx-auto h-6 w-6" />
                    <div className="mt-2 px-2 text-[9px] font-black leading-tight opacity-55">{topic.imageLabel}</div>
                  </div>
                </div>
                <div className="min-w-0 py-0.5">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-black">{topic.category}</span>
                    <span className="rounded-full bg-white/60 px-2 py-0.5 text-[9px] font-bold opacity-75">{topic.urgency}</span>
                  </div>
                  <h2 className="text-[15px] font-black leading-tight text-ink">{topic.title}</h2>
                  <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-relaxed text-ink/62">{topic.summary}</p>
                </div>
                <ChevronRight className="mt-9 h-4 w-4 shrink-0 opacity-45" />
              </div>
            </button>
          );
        })}
      </section>

      {filteredTopics.length === 0 && (
        <div className="rounded-sm border border-dashed border-border bg-white p-8 text-center text-sm font-bold text-ink/50">
          暂时没有匹配的百科内容。
        </div>
      )}

      <Dialog open={!!selectedTopic} onOpenChange={(open) => !open && setSelectedTopic(null)}>
        <DialogContent className="w-[90vw] max-w-[560px] overflow-hidden rounded-sm border-border p-0">
          {selectedTopic && (
            <ScrollArea className="max-h-[86vh]">
              <div className={`border-b bg-gradient-to-br p-5 ${selectedTopic.tone}`}>
                <div className="mb-4 flex h-36 items-center justify-center rounded-sm border border-current/10 bg-white/70">
                  <div className="text-center">
                    <selectedTopic.icon className="mx-auto h-8 w-8" />
                    <div className="mt-2 text-[11px] font-black opacity-55">{selectedTopic.imageLabel}</div>
                  </div>
                </div>
                <DialogHeader>
                  <DialogTitle className="font-serif text-2xl font-bold italic text-ink">{selectedTopic.title}</DialogTitle>
                  <DialogDescription className="text-[12px] font-medium leading-relaxed text-ink/62">
                    {selectedTopic.summary}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="space-y-4 bg-white p-5">
                <TopicBlock title="常见表现" items={selectedTopic.symptoms} />
                <TopicBlock title="先做这几步" items={selectedTopic.firstSteps} />
                <TopicBlock title="先不要做" items={selectedTopic.avoid} warning />
                <div className="rounded-sm border border-accent/15 bg-accent-light/25 p-3">
                  <div className="text-[10px] font-black text-accent">下一步信息</div>
                  <p className="mt-1 text-[12px] font-medium leading-relaxed text-ink/72">{selectedTopic.nextStep}</p>
                </div>
                <Button className="h-10 w-full rounded-sm bg-accent text-sm font-black text-white hover:bg-accent/90">
                  一键诊断这个问题
                </Button>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TopicBlock({ title, items, warning = false }: { title: string; items: string[]; warning?: boolean }) {
  return (
    <div className={`rounded-sm border p-3 ${warning ? 'border-red-100 bg-red-50/55' : 'border-border bg-bg/60'}`}>
      <div className={`mb-2 text-[10px] font-black ${warning ? 'text-red-500' : 'text-ink/45'}`}>{title}</div>
      <div className="space-y-1.5">
        {items.map(item => (
          <div key={item} className="flex gap-2 text-[12px] font-medium leading-relaxed text-ink/72">
            <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${warning ? 'bg-red-400' : 'bg-accent'}`} />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
