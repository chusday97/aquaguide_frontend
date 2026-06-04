import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent, ReactNode, RefObject } from 'react';
import html2canvas from 'html2canvas';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Baby, Check, ChevronRight, Copy, Download, Droplets, Fish, Heart, HelpCircle, Loader2, Maximize2, Search, Settings, Stethoscope, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { careTopicsData, type CareTopic } from '../data/careTopicsData';
import { ImagePreviewModal, type PreviewImage } from '../components/common/ImagePreviewModal';
import { FilterBottomSheet } from '../components/common/FilterBottomSheet';

const categoryChips = ['全部', '鱼不舒服', '水变差', '新鱼入缸', '日常喂食', '换水维护', '怀孕 / 鱼苗', '死亡处理', '设备问题'];
const bannerTopicIds = ['guide_water_deteriorate', 'guide_new_fish_acclimation', 'guide_safe_water_change'];
const CARE_FAVORITES_STORAGE_KEY = 'aqua_care_favorites';

type CareFavoriteMap = Record<string, { id: string; title: string; favoritedAt: string }>;
type CareViewMode = 'all' | 'favorites';
type FlyingFavorite = { id: string; startX: number; startY: number; endX: number; endY: number };
type CareGuideView = {
  title: string;
  summary: string;
  suitableFor: string;
  todayActions: Array<{ title: string; description: string }>;
  avoidActions: Array<{ title: string; reason: string; consequence: string; alternative: string }>;
  warningSigns: Array<{ sign: string; possibleReason: string; action: string }>;
  maintenanceTips: Array<{ title: string; description: string }>;
};
type CareCard = {
  title: string;
  subtitle: string;
  coreSummary: string;
  doActions: Array<{ title: string; description?: string }>;
  avoidActions: Array<{ title: string; reason?: string }>;
  warningSigns: Array<{ sign: string; action: string }>;
  suitableFor: string[];
  source: string;
};

const loadCareFavorites = (): CareFavoriteMap => {
  try {
    const parsed = JSON.parse(localStorage.getItem(CARE_FAVORITES_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const saveCareFavorites = (favorites: CareFavoriteMap) => {
  try {
    localStorage.setItem(CARE_FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // Favorites are lightweight. Ignore storage failures so the page remains usable.
  }
};

const categoryIconMap: Record<string, typeof Droplets> = {
  '水质异常': Waves,
  '怀孕 / 鱼苗': Baby,
  '新鱼入缸': Stethoscope,
  '换水维护': Droplets,
  '死亡处理': AlertTriangle,
  '鱼只异常': Fish,
  '日常喂食': Fish,
  '设备问题': Settings,
  '水草 / 藻类': Waves,
};

const actionPatterns: Array<[RegExp, string]> = [
  [/打氧|气泵|氧气|增氧/, '打氧'],
  [/停止喂食|停喂|暂停喂食/, '停喂'],
  [/少量.*换水|20|30|换水/, '少量换水'],
  [/过滤|出水|滤/, '检查过滤器'],
  [/水温|温差|加热/, '看水温'],
  [/隔离|隔离盒|检疫/, '先隔离'],
  [/捞出|死鱼|尸体/, '捞出死鱼'],
  [/过水|泡袋|对温/, '慢过水'],
  [/残饵|清理|吸便/, '清残饵'],
  [/观察|呼吸|浮头/, '观察状态'],
  [/不要|避免|别/, '当前阶段不建议'],
  [/水面|波纹/, '看水面'],
  [/下药|药/, '别乱下药'],
];

const stripStepPrefix = (value: string) => (
  value
    .replace(/^步骤[一二三四五六七八九十\d]+[：:、\s]*/g, '')
    .replace(/（[^）]*）|\([^)]*\)/g, '')
    .replace(/[。；;,.，]/g, ' ')
    .trim()
);

const cleanCareSentence = (value: string) => (
  value
    .replace(/^步骤[一二三四五六七八九十\d]+[：:、\s]*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
);

const shortActionLabel = (value: string) => {
  const text = stripStepPrefix(value);
  const matched = actionPatterns.find(([pattern]) => pattern.test(text));
  if (matched) return matched[1];
  return text.slice(0, 6) || '查看';
};

const getActionChips = (topic: CareTopic, limit = 3) => {
  const source = topic.firstSteps.length > 0
    ? topic.firstSteps
    : [...topic.keywords, topic.summary];
  return Array.from(new Set(source.map(shortActionLabel).filter(Boolean))).slice(0, limit);
};

const splitActionText = (value: string) => {
  const cleaned = cleanCareSentence(value);
  const parts = cleaned.split(/[：:]/);
  if (parts.length > 1 && parts[0].length <= 10) {
    return { title: parts[0].trim(), description: parts.slice(1).join('：').trim() };
  }
  const title = shortActionLabel(cleaned);
  return {
    title,
    description: cleaned === title ? '' : cleaned,
  };
};

const inferAvoidAlternative = (topic: CareTopic, index: number) => {
  const action = topic.firstSteps[index] || topic.firstSteps[0] || topic.nextStep || topic.summary;
  const cleaned = cleanCareSentence(action).replace(/^下一步建议/, '建议');
  return cleaned || '先保持观察，优先选择对水温和水质影响更小的处理方式。';
};

const inferAvoidReason = (topic: CareTopic, avoidText: string) => {
  const text = cleanCareSentence(avoidText);
  const [, explicitReason] = text.split(/[，,；;]/);
  if (explicitReason?.trim()) return explicitReason.trim();
  if (/脏水|包装袋|直接倒|换水|倒水|温差|pH|水质|自来水/.test(text)) return '这会让水温或水质短时间大幅波动，也可能把运输水里的污染物带入主缸。';
  if (/下药|药|滤材|过滤|清洗/.test(text)) return '原因未确认前处理过重，可能伤到硝化系统或健康个体。';
  if (/喂|饲料|残饵/.test(text)) return '过量食物会迅速污染水体，增加缺氧和氨氮风险。';
  if (/强光|惊吓|捞|移动|追/.test(text)) return '频繁惊扰会增加应激，让恢复或适应过程变慢。';
  if (/混养|大鱼|同一层|其它鱼/.test(text)) return '体型、食性或空间压力会放大追咬、吞食和抢食风险。';
  return topic.summary || '这个操作容易让当前问题进一步扩大。';
};

const inferAvoidConsequence = (reason: string) => {
  if (/缺氧|氨氮|污染|水质/.test(reason)) return '可能出现浮头、趴缸、拒食或水体迅速变差。';
  if (/应激|惊扰|波动|温差/.test(reason)) return '可能导致鱼只休克、躲藏、跳缸或抵抗力下降。';
  if (/硝化|滤材|下药|药/.test(reason)) return '可能造成硝化系统受损，后续水质更难稳定。';
  if (/吞食|追咬|抢食|混养/.test(reason)) return '可能造成受伤、被吃或长期躲避不进食。';
  return '可能让问题变得更难判断，也更难恢复稳定。';
};

const buildAvoidActions = (topic: CareTopic): CareGuideView['avoidActions'] => (
  topic.avoid.slice(0, 4).map((item, index) => {
    const sentence = cleanCareSentence(item);
    const [firstClause, ...rest] = sentence.split(/[，,；;]/).map(part => part.trim()).filter(Boolean);
    const title = firstClause || sentence;
    const reason = rest.length > 0 ? rest.join('，') : inferAvoidReason(topic, sentence);
    return {
      title,
      reason,
      consequence: inferAvoidConsequence(reason),
      alternative: inferAvoidAlternative(topic, index),
    };
  })
);

const warningPatterns: Array<{ pattern: RegExp; sign: string; possibleReason: string; action: string }> = [
  { pattern: /浮头|呼吸|喘|缺氧/, sign: '浮头或呼吸急促', possibleReason: '可能是缺氧、水质恶化或温差刺激。', action: '先增加供氧，检查过滤出水，并少量换入等温除氯水。' },
  { pattern: /拒食|不吃|趴缸|不动/, sign: '拒食或趴缸', possibleReason: '可能是应激、水温波动或水质指标异常。', action: '暂停加餐，观察体表和呼吸，同时补测温度、pH、氨氮和亚硝酸盐。' },
  { pattern: /躲|扎堆|惊慌|急游/, sign: '躲藏、扎堆或急游', possibleReason: '可能是环境变化太快、光照过强或被追逐。', action: '降低光照和打扰，增加遮蔽物，确认没有被其它生物追咬。' },
  { pattern: /死亡|死鱼|夭折|暴毙/, sign: '死亡数量增加', possibleReason: '可能是急性水质问题、传染病或强烈应激。', action: '立刻移除死亡个体，暂停喂食，少量换水并加强供氧。' },
  { pattern: /白点|烂尾|红斑|充血|立鳞/, sign: '体表出现病灶', possibleReason: '可能是外寄、细菌感染或水质长期不稳。', action: '先隔离观察，记录症状变化，再决定是否药浴或一键诊断。' },
  { pattern: /卵黄囊|鱼苗|平游|开口/, sign: '鱼苗状态异常', possibleReason: '可能是水流过强、开口食物不合适或温度不稳。', action: '保持弱水流和恒温，少量多次喂食，及时清理残饵。' },
];

const getDefaultWarningSigns = (topic: CareTopic): CareGuideView['warningSigns'] => {
  if (/怀孕|鱼苗/.test(topic.category + topic.title)) {
    return [
      { sign: '鱼苗扎堆或不平游', possibleReason: '可能是水温波动、水流过强或水质开始变差。', action: '保持弱水流，确认水温稳定，少量清理残饵。' },
      { sign: '死亡数量增加', possibleReason: '可能是喂食污染、缺氧或换水刺激。', action: '暂停喂食，少量换入等温水，并增加供氧。' },
    ];
  }
  if (/水质|换水|自来水|油膜|白浊/.test(topic.category + topic.title + topic.summary)) {
    return [
      { sign: '鱼浮头或水面聚集', possibleReason: '可能是溶氧不足或水质恶化。', action: '增加水面扰动和供氧，减少喂食并观察 1-2 小时。' },
      { sign: '水体异味或浑浊加重', possibleReason: '可能是有机物堆积或硝化系统不稳定。', action: '少量换水，清理残饵，不要大洗滤材。' },
    ];
  }
  return [
    { sign: '状态突然变差', possibleReason: '可能是水质、温度、混养压力或近期操作变化造成。', action: '先暂停新增操作，记录变化时间，再补充水温和水质数据。' },
  ];
};

const buildWarningSigns = (topic: CareTopic): CareGuideView['warningSigns'] => {
  const matched = topic.symptoms
    .map(item => {
      const cleaned = cleanCareSentence(item);
      const preset = warningPatterns.find(({ pattern }) => pattern.test(cleaned));
      if (!preset) return null;
      return {
        sign: preset.sign,
        possibleReason: preset.possibleReason,
        action: preset.action,
      };
    })
    .filter((item): item is CareGuideView['warningSigns'][number] => Boolean(item));
  const unique = matched.filter((item, index, list) => list.findIndex(other => other.sign === item.sign) === index);
  return (unique.length > 0 ? unique : getDefaultWarningSigns(topic)).slice(0, 4);
};

const buildCareGuide = (topic: CareTopic): CareGuideView => {
  const todayActions = topic.firstSteps.slice(0, 4).map(item => {
    const action = splitActionText(item);
    return {
      title: action.title,
      description: action.description || cleanCareSentence(item),
    };
  });
  const maintenanceTips = [
    ...topic.observe.map(item => ({ title: '观察重点', description: cleanCareSentence(item) })),
    ...topic.diagnoseWhen.map(item => ({ title: '后续判断', description: cleanCareSentence(item) })),
    ...(topic.nextStep ? [{ title: '下一步', description: cleanCareSentence(topic.nextStep) }] : []),
  ].filter(item => item.description);

  return {
    title: getDisplayTitle(topic),
    summary: topic.summary,
    suitableFor: topic.symptoms.length > 0 ? cleanCareSentence(topic.symptoms[0]) : topic.summary,
    todayActions,
    avoidActions: buildAvoidActions(topic),
    warningSigns: buildWarningSigns(topic),
    maintenanceTips: maintenanceTips.length > 0
      ? maintenanceTips
      : [{ title: '持续观察', description: topic.summary || '处理后继续观察鱼只状态、水温和水体变化。' }],
  };
};

const getRelatedTopics = (topic: CareTopic) => (
  careTopicsData
    .filter(item => item.id !== topic.id)
    .map(item => {
      const sharedTags = item.keywords.filter(keyword => topic.keywords.includes(keyword)).length;
      const score =
        (item.category === topic.category ? 6 : 0)
        + sharedTags * 2
        + (/水质|鱼只|换水|入缸|鱼苗|设备/.test(`${item.title}${topic.title}`) ? 1 : 0);
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ item }) => item)
);

const symptomQuestionPatterns: Array<[RegExp, string]> = [
  [/浮头|喘|呼吸/, '是否看到鱼浮头或呼吸急促？'],
  [/发白|发绿|发黄|异味|臭|油膜|泡沫/, '水体是否变浑、有异味或油膜？'],
  [/残饵|喂食|过滤棉|脏/, '缸底是否有残饵或过滤变脏？'],
  [/躲|趴缸|不动|拒食/, '鱼是否躲藏、趴缸或拒食？'],
  [/白点|烂尾|红斑|充血/, '鱼身上是否有白点、红斑或烂尾？'],
  [/肚子|胎斑|怀孕|生产/, '母鱼是否肚子变大或出现临产表现？'],
  [/鱼苗|平游|开口|卵黄囊/, '鱼苗是否已经开始平游找食？'],
  [/加热棒|过滤|气泵|灯/, '设备是否出现停止或异常？'],
];

const getJudgementQuestions = (topic: CareTopic) => (
  topic.symptoms.slice(0, 3).map((symptom, index) => {
    const cleaned = stripStepPrefix(symptom);
    const matched = symptomQuestionPatterns.find(([pattern]) => pattern.test(cleaned));
    return {
      id: `${topic.id}-judge-${index}`,
      source: symptom,
      question: matched?.[1] || `是否出现：${cleaned.length > 22 ? `${cleaned.slice(0, 22)}…` : cleaned}？`,
    };
  })
);

const vagueCareCardPatterns = [/^避开风险$/, /^注意观察$/, /^保持稳定$/, /^及时处理$/, /^查过滤$/, /^观察状态$/];

const isVagueCareCardText = (value: string) => {
  const text = cleanCareSentence(value).replace(/[。！!，,\s]/g, '');
  return vagueCareCardPatterns.some(pattern => pattern.test(text));
};

const actionTextForCard = (title: string, description?: string) => {
  const cleanTitle = cleanCareSentence(title);
  const cleanDescription = cleanCareSentence(description || '');
  if (cleanDescription && (isVagueCareCardText(cleanTitle) || cleanTitle.length <= 6 || !/[。；，,]/.test(cleanTitle))) {
    return cleanDescription;
  }
  return cleanTitle || cleanDescription;
};

const careCardKey = (value: string) => (
  cleanCareSentence(value)
    .replace(/^(不要|别|避免|请|先|再|立刻|马上)/, '')
    .replace(/[，。；;,.、\s]/g, '')
    .slice(0, 16)
);

const buildCareCard = (topic: CareTopic): CareCard => {
  const guide = buildCareGuide(topic);
  const doActions = guide.todayActions
    .map(item => ({
      title: actionTextForCard(item.title, item.description),
      description: undefined,
    }))
    .filter(item => item.title && !isVagueCareCardText(item.title))
    .slice(0, 4);

  const doKeys = new Set(doActions.map(item => careCardKey(item.title)));
  const avoidActions = guide.avoidActions
    .map(item => ({
      title: actionTextForCard(item.title),
      reason: cleanCareSentence(item.reason),
    }))
    .filter(item => item.title && !isVagueCareCardText(item.title))
    .filter(item => !doKeys.has(careCardKey(item.title)) || /^不要|避免|别/.test(item.title))
    .slice(0, 4);

  const suitableFor = Array.from(new Set([
    topic.category,
    ...topic.keywords.slice(0, 3),
    guide.suitableFor,
  ].map(cleanCareSentence).filter(Boolean))).slice(0, 4);

  return {
    title: guide.title,
    subtitle: topic.category,
    coreSummary: guide.summary,
    doActions,
    avoidActions,
    warningSigns: guide.warningSigns.slice(0, 4).map(item => ({
      sign: item.sign,
      action: item.action,
    })),
    suitableFor,
    source: '来自 AquaGuide',
  };
};

const formatCareCardAction = (item: { title: string; description?: string; reason?: string }) => {
  const detail = item.description || item.reason;
  return detail ? `${item.title}。${detail}`.replace(/。。/g, '。') : item.title;
};

const buildCareCardCopyText = (careCard: CareCard) => (
  [
    ['【AquaGuide 养护卡】', careCard.title],
    ['核心结论：', careCard.coreSummary],
    careCard.doActions.length > 0
      ? ['先做：', ...careCard.doActions.map((item, index) => `${index + 1}. ${formatCareCardAction(item)}`)]
      : [],
    careCard.avoidActions.length > 0
      ? ['暂时避免：', ...careCard.avoidActions.map((item, index) => `${index + 1}. ${formatCareCardAction(item)}`)]
      : [],
    careCard.warningSigns.length > 0
      ? ['异常提醒：', ...careCard.warningSigns.map(item => `${item.sign}：${item.action}`)]
      : [],
    [careCard.source],
  ].filter(group => group.length > 0).map(group => group.join('\n')).join('\n\n')
);

const copyPlainText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    if (!copied) throw new Error('copy command failed');
  }
};

const getCareImage = (topic: CareTopic) => {
  if (!topic.imageUrl) return '';
  if (topic.imageUrl.startsWith('/')) return topic.imageUrl;
  return `/${topic.imageUrl}`;
};

const displayTitleMap: Record<string, string> = {
  guide_new_fish_acclimation: '如何安全给新鱼过水？',
  guide_water_deteriorate: '水质变差怎么办？',
  guide_pregnant_care: '母鱼怀孕后怎么护理？',
  guide_fry_care: '鱼苗出生后怎么照料？',
  guide_safe_water_change: '如何安全换水？',
  guide_fish_death_action: '鱼死了以后怎么处理？',
};

const getDisplayTitle = (topic: CareTopic) => {
  if (displayTitleMap[topic.id]) return displayTitleMap[topic.id];
  const title = topic.title.trim();
  if (/[\?？]$/.test(title) || /怎么办|如何|怎么|要不要|能不能|可以吗|有危害吗|需要注意/.test(title)) {
    return title;
  }
  if (/入缸|过水/.test(title)) return '如何安全给新鱼过水？';
  if (/水质|水浑|发白|发绿|异味|油膜/.test(title)) return `${title}怎么办？`;
  if (/怀孕|母鱼/.test(title)) return '母鱼怀孕后怎么护理？';
  if (/鱼苗/.test(title)) return '鱼苗出生后怎么照料？';
  if (/换水/.test(title)) return `如何${title.replace(/^怎么/, '')}？`;
  if (/气泵|打氧/.test(title)) return '鱼缸一定要气泵打氧吗？';
  if (/死亡|死鱼/.test(title)) return '鱼死了以后怎么处理？';
  return `${title}怎么办？`;
};

const getPriorityBadge = (topic: CareTopic) => {
  if (topic.urgency === '高优先级') return { label: '立即处理', className: 'bg-red-600 text-white' };
  if (topic.urgency === '尽快处理') return { label: '建议优先看', className: 'bg-amber-100 text-amber-700' };
  return null;
};

const matchesChip = (topic: CareTopic, chip: string) => {
  const haystack = `${topic.title} ${topic.category} ${topic.summary} ${topic.keywords.join(' ')}`;
  if (chip === '全部') return true;
  if (chip === '急救') return topic.urgency === '高优先级' || /死|浮头|喘|臭|白点|烂尾|急|异常/.test(haystack);
  if (chip === '鱼不舒服') return /鱼只异常|病|白点|烂尾|趴缸|拒食|浮头|喘/.test(haystack);
  if (chip === '水变差') return /水质|水浑|白浊|发绿|异味|油膜|氨氮|亚硝酸盐/.test(haystack);
  if (chip === '新鱼入缸' || chip === '入缸') return /入缸|新鱼|过水|检疫/.test(haystack);
  if (chip === '日常喂食' || chip === '喂食') return /喂|饲料|吃|残饵/.test(haystack);
  if (chip === '换水维护' || chip === '换水') return /换水|困水|除氯/.test(haystack);
  if (chip === '怀孕 / 鱼苗' || chip === '鱼苗') return /鱼苗|怀孕|繁殖|母鱼/.test(haystack);
  if (chip === '死亡处理') return /死亡|死鱼|连续死/.test(haystack);
  if (chip === '设备') return /设备|过滤|加热棒|气泵|灯/.test(haystack);
  if (chip === '设备问题') return /设备|过滤|加热棒|气泵|灯/.test(haystack);
  return true;
};

const inferDiagnosisType = (topic: CareTopic) => {
  const text = `${topic.title}${topic.category}${topic.summary}`;
  if (/换水|安全换水/.test(text)) return '换水';
  if (/水质|水浑|发白|发绿|异味|臭/.test(text)) return '水质异常';
  if (/入缸|新鱼|过水/.test(text)) return '新鱼入缸';
  if (/喂|残饵|饲料/.test(text)) return '喂食问题';
  if (/怀孕|鱼苗|繁殖|母鱼/.test(text)) return '怀孕/鱼苗';
  if (/死亡|死鱼|连续死/.test(text)) return '死亡处理';
  if (/设备|过滤|加热棒|气泵/.test(text)) return '设备异常';
  return '鱼只异常';
};

export default function CareEncyclopedia() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');
  const [selectedTopic, setSelectedTopic] = useState<CareTopic | null>(null);
  const [checkedActions, setCheckedActions] = useState<string[]>([]);
  const [checkedSymptoms, setCheckedSymptoms] = useState<string[]>([]);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCareFilterOpen, setIsCareFilterOpen] = useState(false);
  const [draftCareCategory, setDraftCareCategory] = useState(activeCategory);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [careViewMode, setCareViewMode] = useState<CareViewMode>('all');
  const [draftCareViewMode, setDraftCareViewMode] = useState<CareViewMode>('all');
  const [favorites, setFavorites] = useState<CareFavoriteMap>(() => loadCareFavorites());
  const [shareTopic, setShareTopic] = useState<CareTopic | null>(null);
  const [isSavingShareCard, setIsSavingShareCard] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [carouselDragStart, setCarouselDragStart] = useState<{ x: number; y: number } | null>(null);
  const [carouselDeltaX, setCarouselDeltaX] = useState(0);
  const [carouselPausedUntil, setCarouselPausedUntil] = useState(0);
  const [isCarouselHovering, setIsCarouselHovering] = useState(false);
  const [flyingFavorites, setFlyingFavorites] = useState<FlyingFavorite[]>([]);
  const carouselDraggedRef = useRef(false);
  const detailScrollRef = useRef<HTMLDivElement | null>(null);
  const favoriteShelfRef = useRef<HTMLButtonElement | null>(null);
  const careCardRef = useRef<HTMLDivElement | null>(null);

  const bannerTopics = useMemo(() => (
    bannerTopicIds
      .map(id => careTopicsData.find(topic => topic.id === id))
      .filter((topic): topic is CareTopic => Boolean(topic))
  ), []);

  useEffect(() => {
    if (bannerTopics.length <= 1) return;
    const timer = window.setInterval(() => {
      if (Date.now() < carouselPausedUntil || isCarouselHovering || carouselDragStart) return;
      setActiveBannerIndex(prev => (prev + 1) % bannerTopics.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [bannerTopics.length, carouselDragStart, carouselPausedUntil, isCarouselHovering]);

  const pauseCarousel = () => {
    setCarouselPausedUntil(Date.now() + 6000);
  };

  const goToBanner = (index: number) => {
    pauseCarousel();
    setActiveBannerIndex((index + bannerTopics.length) % bannerTopics.length);
  };

  const openCareDetail = (topicId: string) => {
    const topic = careTopicsData.find(item => item.id === topicId);
    if (!topic) return;
    setSelectedTopic(topic);
    setCheckedActions([]);
    setCheckedSymptoms([]);
    window.setTimeout(() => {
      detailScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);
  };

  const openBannerTopic = (topic: CareTopic, index: number, force = false) => {
    if (!force && carouselDraggedRef.current) return;
    setActiveBannerIndex(index);
    pauseCarousel();
    openCareDetail(topic.id);
  };

  const launchFavoriteFly = (source?: HTMLElement) => {
    const target = favoriteShelfRef.current;
    if (!source || !target) return;
    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const flyItem = {
      id,
      startX: sourceRect.left + sourceRect.width / 2 - 12,
      startY: sourceRect.top + sourceRect.height / 2 - 12,
      endX: targetRect.left + targetRect.width / 2 - 12,
      endY: targetRect.top + targetRect.height / 2 - 12,
    };
    setFlyingFavorites(prev => [...prev, flyItem]);
    window.setTimeout(() => {
      setFlyingFavorites(prev => prev.filter(item => item.id !== id));
    }, 720);
  };

  const toggleFavorite = (topic: CareTopic, source?: HTMLElement) => {
    if (!favorites[topic.id]) launchFavoriteFly(source);
    setFavorites(prev => {
      const next = { ...prev };
      if (next[topic.id]) {
        delete next[topic.id];
      } else {
        next[topic.id] = {
          id: topic.id,
          title: getDisplayTitle(topic),
          favoritedAt: new Date().toISOString(),
        };
      }
      saveCareFavorites(next);
      return next;
    });
  };

  const filteredTopics = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return careTopicsData.filter(topic => {
      const matchesCategory = matchesChip(topic, activeCategory);
      const matchesView = careViewMode === 'all' || Boolean(favorites[topic.id]);
      const searchable = [
        topic.title,
        topic.category,
        topic.urgency,
        topic.summary,
        topic.nextStep,
        ...topic.keywords,
        ...topic.symptoms,
        ...topic.firstSteps,
        ...topic.avoid,
        ...topic.observe,
        ...topic.diagnoseWhen,
      ].join(' ').toLowerCase();
      return matchesView && matchesCategory && (!keyword || searchable.includes(keyword));
    });
  }, [activeCategory, careViewMode, favorites, searchTerm]);

  const recommendedTopics = useMemo(() => {
    const favoriteTopics = Object.keys(favorites)
      .map(id => careTopicsData.find(topic => topic.id === id))
      .filter((topic): topic is CareTopic => Boolean(topic))
      .slice(0, 1);
    const defaultTopics = [
      'guide_water_deteriorate',
      'guide_fish_gasping',
      'guide_new_fish_acclimation',
      'guide_safe_water_change',
    ]
      .map(id => careTopicsData.find(topic => topic.id === id))
      .filter((topic): topic is CareTopic => Boolean(topic));
    return [...favoriteTopics, ...defaultTopics]
      .filter((topic, index, list) => list.findIndex(item => item.id === topic.id) === index)
      .slice(0, 3);
  }, [favorites]);

  const favoriteTopics = useMemo(() => (
    Object.values(favorites)
      .sort((a, b) => new Date(b.favoritedAt).getTime() - new Date(a.favoritedAt).getTime())
      .map(item => careTopicsData.find(topic => topic.id === item.id))
      .filter((topic): topic is CareTopic => Boolean(topic))
  ), [favorites]);

  const currentCareScopeLabel = careViewMode === 'favorites'
    ? '我的收藏'
    : activeCategory === '全部'
      ? '全部问题'
      : activeCategory;
  const favoriteCount = Object.keys(favorites).length;

  const openPreview = (topic: CareTopic) => {
    const image = getCareImage(topic);
    if (!image) return;
    setPreviewImages([{ src: image, title: topic.title }]);
    setPreviewIndex(0);
    setIsPreviewOpen(true);
  };

  const handleCarouselPointerDown = (event: PointerEvent<HTMLElement>) => {
    setCarouselDragStart({ x: event.clientX, y: event.clientY });
    setCarouselDeltaX(0);
    carouselDraggedRef.current = false;
    pauseCarousel();
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleCarouselPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!carouselDragStart) return;
    const deltaX = event.clientX - carouselDragStart.x;
    const deltaY = event.clientY - carouselDragStart.y;
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 12) return;
    if (Math.abs(deltaX) > 40) carouselDraggedRef.current = true;
    setCarouselDeltaX(deltaX);
  };

  const handleCarouselPointerUp = () => {
    if (!carouselDragStart) return;
    if (carouselDeltaX < -40) {
      goToBanner(activeBannerIndex + 1);
    } else if (carouselDeltaX > 40) {
      goToBanner(activeBannerIndex - 1);
    }
    setCarouselDragStart(null);
    setCarouselDeltaX(0);
    window.setTimeout(() => {
      carouselDraggedRef.current = false;
    }, 80);
  };

  const toggleValue = (value: string, setter: (updater: (prev: string[]) => string[]) => void) => {
    setter(prev => prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]);
  };

  const startDiagnosis = (topic: CareTopic) => {
    sessionStorage.setItem('aquaguide_pending_diagnosis', JSON.stringify({
      source: 'care',
      topicId: topic.id,
      title: topic.title,
      category: topic.category,
      diagnosisType: inferDiagnosisType(topic),
      summary: topic.summary,
      selectedSymptoms: checkedSymptoms,
      completedSteps: checkedActions,
      prepInfo: [...topic.diagnoseWhen, topic.nextStep].filter(Boolean).slice(0, 4),
    }));
    navigate('/aquarium?diagnosis=care');
  };

  const copyShareText = async (topic: CareTopic) => {
    const text = buildCareCardCopyText(buildCareCard(topic));
    try {
      await copyPlainText(text);
      setCopyMessage('已复制');
      window.setTimeout(() => setCopyMessage(''), 1800);
    } catch {
      setCopyMessage('复制失败，请手动长按复制');
    }
  };

  const saveShareCard = async (topic: CareTopic) => {
    if (!careCardRef.current) {
      setShareMessage('保存失败，请截图保存');
      return;
    }
    setIsSavingShareCard(true);
    setShareMessage('');
    try {
      const canvas = await html2canvas(careCardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        onclone: (clonedDocument) => {
          const clonedCard = clonedDocument.querySelector<HTMLElement>('[data-care-share-card]');
          if (!clonedCard) return;
          const nodes = [clonedCard, ...Array.from(clonedCard.querySelectorAll<HTMLElement>('*'))];
          nodes.forEach((node) => {
            const className = node.className.toString();
            node.style.boxShadow = 'none';
            node.style.outlineColor = 'transparent';
            node.style.textDecorationColor = 'transparent';
            node.style.borderColor = '#F1E9D8';
            node.style.color = '#16221D';
            if (className.includes('text-emerald')) node.style.color = '#0F5132';
            if (className.includes('text-orange')) node.style.color = '#9A3412';
            if (className.includes('text-amber')) node.style.color = '#92400E';
            if (className.includes('text-white')) node.style.color = '#FFFFFF';
            if (className.includes('text-ink/')) node.style.color = '#66736D';
            if (className.includes('bg-emerald')) node.style.backgroundColor = '#E8F5EF';
            else if (className.includes('bg-orange')) node.style.backgroundColor = '#FFF4E8';
            else if (className.includes('bg-amber')) node.style.backgroundColor = '#FFF7D6';
            else if (className.includes('bg-[#F4EFE3]')) node.style.backgroundColor = '#F4EFE3';
            else if (className.includes('bg-white')) node.style.backgroundColor = '#FFFFFF';
            else if (node === clonedCard) node.style.backgroundColor = '#FFFDF8';
            else node.style.backgroundColor = node.style.backgroundColor || 'transparent';
          });
        },
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'aquaguide-care-card.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setShareMessage('图片已保存');
      window.setTimeout(() => setShareMessage(''), 2200);
    } catch {
      setShareMessage('保存失败，请截图保存');
    } finally {
      setIsSavingShareCard(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-3 overflow-x-hidden pb-24">
      <section className="rounded-[18px] border border-white/80 bg-white p-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[20px] font-black leading-tight text-ink">养护百科</h1>
            <p className="mt-1 text-[12px] font-medium text-ink/55">按日常问题快速查处理方法。</p>
          </div>
        </div>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="搜索：水浑、浮头、不吃食、死鱼、怀孕、换水..."
            className="h-10 rounded-full border-border bg-bg pl-9 text-[13px] font-medium text-ink placeholder:text-ink/36"
          />
        </div>
      </section>

      {bannerTopics.length > 0 && (
        <section
          className="overflow-hidden rounded-[20px] border border-white/80 bg-white p-2.5 shadow-sm"
          onPointerDown={handleCarouselPointerDown}
          onPointerMove={handleCarouselPointerMove}
          onPointerUp={handleCarouselPointerUp}
          onPointerCancel={handleCarouselPointerUp}
          onMouseEnter={() => setIsCarouselHovering(true)}
          onMouseLeave={() => {
            setIsCarouselHovering(false);
            handleCarouselPointerUp();
          }}
        >
          <div className="overflow-hidden">
            <div
              className={`flex ${carouselDragStart ? '' : 'transition-transform duration-300 ease-out'}`}
              style={{ transform: `translateX(calc(-${activeBannerIndex * 100}% + ${carouselDeltaX}px))` }}
            >
            {bannerTopics.map((topic, index) => (
              <div key={topic.id} className="grid min-w-full grid-cols-[42%_1fr] gap-3">
                <button
                  type="button"
                  onClick={() => openBannerTopic(topic, index)}
                  className="relative flex h-[150px] items-center justify-center overflow-hidden rounded-[16px] bg-bg"
                  aria-label={`查看${getDisplayTitle(topic)}`}
                >
                  <CareImage topic={topic} className="h-full w-full" />
                </button>
                <div className="min-w-0 py-1 text-left">
                  <div className="text-[10px] font-black text-emerald-700">推荐专题</div>
                  <h2 className="mt-1 line-clamp-2 text-[17px] font-black leading-tight text-ink">{getDisplayTitle(topic)}</h2>
                  <p className="mt-1.5 line-clamp-3 text-[12px] font-medium leading-relaxed text-ink/58">{topic.summary}</p>
                  <button
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      openBannerTopic(topic, index, true);
                    }}
                    className="mt-2 inline-flex rounded-full bg-emerald-700 px-3 py-1.5 text-[11px] font-black text-white"
                  >
                    立即查看
                  </button>
                </div>
              </div>
            ))}
            </div>
          </div>
          <div className="mt-1 flex justify-center gap-1.5">
            {bannerTopics.map((topic, index) => (
              <button
                key={topic.id}
                type="button"
                aria-label={`切换到${topic.title}`}
                onClick={() => goToBanner(index)}
                className="flex h-5 w-7 items-center justify-center rounded-full"
              >
                <span className={`h-1.5 rounded-full transition-all ${activeBannerIndex === index ? 'w-5 bg-emerald-700' : 'w-1.5 bg-ink/18'}`} />
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-[18px] border border-white/80 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <div className="text-[15px] font-black text-ink">我的收藏里的文章</div>
            <div className="mt-0.5 text-[11px] font-bold text-ink/42">把常用养护内容放在这里快速打开。</div>
          </div>
          <button
            type="button"
            ref={favoriteShelfRef}
            onClick={() => {
              setIsFavoritesOpen(true);
            }}
            className="shrink-0 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-black text-emerald-700"
          >
            我的收藏{favoriteCount > 0 ? ` ${favoriteCount}` : ''}
            <ChevronRight className="ml-0.5 inline h-3.5 w-3.5" />
          </button>
        </div>
        <div className="grid gap-2">
          {(favoriteTopics.length > 0 ? favoriteTopics : []).map(topic => (
            <button
              key={topic.id}
              type="button"
              onClick={() => openCareDetail(topic.id)}
              className="grid grid-cols-[48px_1fr_auto] items-center gap-2 rounded-[14px] bg-bg px-2.5 py-2 text-left transition-colors hover:bg-emerald-50"
            >
              <CareImage topic={topic} className="h-12 w-12 rounded-[12px]" />
              <span className="min-w-0">
                <span className="line-clamp-1 block text-[13px] font-black text-ink">{getDisplayTitle(topic)}</span>
                <span className="line-clamp-1 block text-[10px] font-medium text-ink/45">{topic.summary}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-ink/28" />
            </button>
          ))}
          {favoriteTopics.length === 0 && (
            <div className="rounded-[14px] border border-dashed border-border bg-bg px-3 py-5 text-center">
              <div className="text-[13px] font-black text-ink/62">还没有收藏的养护文章</div>
              <p className="mt-1 text-[11px] font-medium text-ink/42">打开文章后点击右上角爱心，就会加入这里。</p>
            </div>
          )}
        </div>
      </section>

      {(activeCategory !== '全部' || careViewMode !== 'all' || searchTerm.trim()) && (
        <div className="flex items-center justify-between gap-3 rounded-[14px] border border-emerald-100 bg-emerald-50 px-3 py-2">
          <div className="min-w-0 truncate text-[12px] font-black text-emerald-800">
            当前查看：{currentCareScopeLabel}
            {searchTerm.trim() ? ` · 搜索“${searchTerm.trim()}”` : ''}
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveCategory('全部');
              setCareViewMode('all');
              setSearchTerm('');
            }}
            className="shrink-0 text-[11px] font-black text-emerald-700"
          >
            清除
          </button>
        </div>
      )}

      <section className="grid grid-cols-1 gap-3">
        {filteredTopics.map(topic => (
          <CareArticleCard
            key={topic.id}
            topic={topic}
            favorite={Boolean(favorites[topic.id])}
            onClick={() => openCareDetail(topic.id)}
            onToggleFavorite={(source) => toggleFavorite(topic, source)}
          />
        ))}
      </section>

      {filteredTopics.length === 0 && (
        <div className="rounded-[18px] border border-dashed border-border bg-white p-8 text-center text-sm font-bold text-ink/50">
          {careViewMode === 'favorites'
            ? '还没有收藏的养护问题。看到常用问题时，点文章右上角爱心就会加入这里。'
            : '暂时没有匹配的百科内容。'}
        </div>
      )}

      <Dialog open={!!selectedTopic} onOpenChange={(open) => !open && setSelectedTopic(null)}>
        <DialogContent className="w-[92vw] max-w-[560px] overflow-hidden rounded-[24px] border-border p-0">
          {selectedTopic && (
            <CareArticleDetail
              key={selectedTopic.id}
              topic={selectedTopic}
              scrollRef={detailScrollRef}
              checkedActions={checkedActions}
              checkedSymptoms={checkedSymptoms}
              favorite={Boolean(favorites[selectedTopic.id])}
              onToggleAction={(value) => toggleValue(value, setCheckedActions)}
              onToggleSymptom={(value) => {
                const [source] = value.split(':');
                setCheckedSymptoms(prev => {
                  const cleared = prev.filter(item => !item.startsWith(`${source}:`));
                  return prev.includes(value) ? cleared : [...cleared, value];
                });
              }}
              onStartDiagnosis={() => startDiagnosis(selectedTopic)}
              onToggleFavorite={(source) => toggleFavorite(selectedTopic, source)}
              onOpenShare={() => {
                setShareTopic(selectedTopic);
                setShareMessage('');
                setCopyMessage('');
              }}
              onPreview={() => openPreview(selectedTopic)}
              onSelectRelated={(topic) => openCareDetail(topic.id)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isFavoritesOpen} onOpenChange={setIsFavoritesOpen}>
        <DialogContent className="flex max-h-[82dvh] w-[92vw] max-w-[430px] flex-col overflow-hidden rounded-[24px] border-border bg-bg p-0">
          <div className="shrink-0 border-b border-white bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[16px] font-black text-ink">我的收藏</div>
                <div className="mt-0.5 text-[11px] font-bold text-ink/45">已收藏 {favoriteCount} 篇养护内容。</div>
              </div>
              <Heart className="h-5 w-5 text-rose-500" />
            </div>
          </div>
          <div className="app-scrollbar-hidden min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3">
            {favoriteTopics.length > 0 ? (
              <div className="grid gap-2">
                {favoriteTopics.map(topic => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => {
                      setIsFavoritesOpen(false);
                      openCareDetail(topic.id);
                    }}
                    className="grid grid-cols-[54px_1fr_auto] items-center gap-2 rounded-[16px] bg-white p-2 text-left shadow-sm transition-colors hover:bg-emerald-50"
                  >
                    <CareImage topic={topic} className="h-[54px] w-[54px] rounded-[14px]" />
                    <span className="min-w-0">
                      <span className="line-clamp-1 block text-[13px] font-black text-ink">{getDisplayTitle(topic)}</span>
                      <span className="line-clamp-2 block text-[11px] font-medium leading-relaxed text-ink/48">{topic.summary}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-ink/28" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-[18px] border border-dashed border-border bg-white px-5 py-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                  <Heart className="h-5 w-5" />
                </div>
                <div className="mt-3 text-sm font-black text-ink">还没有收藏</div>
                <p className="mx-auto mt-1 max-w-[250px] text-[11px] font-medium leading-relaxed text-ink/50">
                  看到常用养护文章时，点击文章右上角爱心就会加入这里。
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {flyingFavorites.map(item => (
        <div
          key={item.id}
          className="aqua-favorite-fly pointer-events-none fixed z-[80] flex h-6 w-6 items-center justify-center rounded-full bg-rose-50 text-rose-500 shadow-lg ring-1 ring-rose-100"
          style={{
            left: item.startX,
            top: item.startY,
            '--favorite-dx': `${item.endX - item.startX}px`,
            '--favorite-dy': `${item.endY - item.startY}px`,
          } as CSSProperties & Record<'--favorite-dx' | '--favorite-dy', string>}
        >
          <Heart className="h-3.5 w-3.5 fill-current" />
        </div>
      ))}

      <style>{`
        @keyframes aquaFavoriteFly {
          0% {
            opacity: 0;
            transform: translate3d(0, 0, 0) scale(0.72);
          }
          14% {
            opacity: 1;
            transform: translate3d(0, -8px, 0) scale(1.08);
          }
          70% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate3d(var(--favorite-dx), var(--favorite-dy), 0) scale(0.42);
          }
        }

        .aqua-favorite-fly {
          animation: aquaFavoriteFly 680ms cubic-bezier(0.2, 0.75, 0.24, 1) forwards;
        }

        .aqua-care-card-modal-body {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .aqua-care-card-modal-body::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <ImagePreviewModal
        images={previewImages}
        index={previewIndex}
        open={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onIndexChange={setPreviewIndex}
      />

      <FilterBottomSheet
        open={isCareFilterOpen}
        title="选择问题场景"
        subtitle="选择一个问题场景，列表会按场景更新。"
        groups={[
          {
            title: '问题场景',
            selected: draftCareCategory,
            onSelect: setDraftCareCategory,
            options: categoryChips.map(label => ({ label })),
          },
          {
            title: '查看方式',
            selected: draftCareViewMode === 'favorites' ? '我的收藏' : '全部',
            onSelect: (label) => setDraftCareViewMode(label === '我的收藏' ? 'favorites' : 'all'),
            options: [{ label: '全部' }, { label: '我的收藏' }, { label: '最近查看', hint: '暂按推荐优先' }],
          },
        ]}
        onClose={() => setIsCareFilterOpen(false)}
        onReset={() => {
          setDraftCareCategory('全部');
          setActiveCategory('全部');
          setDraftCareViewMode('all');
          setCareViewMode('all');
          setIsCareFilterOpen(false);
        }}
        onApply={() => {
          setActiveCategory(draftCareCategory);
          setCareViewMode(draftCareViewMode);
          setIsCareFilterOpen(false);
        }}
      />

      <Dialog open={!!shareTopic} onOpenChange={(open) => {
        if (!open) {
          setShareTopic(null);
          setShareMessage('');
          setCopyMessage('');
        }
      }}>
        <DialogContent className="flex max-h-[82dvh] w-[min(480px,calc(100vw-32px))] max-w-[480px] flex-col overflow-hidden rounded-[28px] border-border bg-white p-0">
          {shareTopic && (
            <>
              <div className="shrink-0 border-b border-white bg-white px-4 py-3">
                <div className="text-[16px] font-black text-ink">生成养护卡</div>
                <div className="mt-0.5 text-[11px] font-bold text-ink/45">提取关键步骤，生成可复制、可保存的移动端卡片。</div>
              </div>
              <div className="aqua-care-card-modal-body min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#F7F4EC]/55 px-3 py-4">
                <CareShareCardPreview topic={shareTopic} cardRef={careCardRef} />
                {(shareMessage || copyMessage) && (
                  <div className="mt-3 rounded-[14px] bg-white px-3 py-2 text-center text-[12px] font-bold text-emerald-700">
                    {shareMessage || copyMessage}
                  </div>
                )}
              </div>
              <div className="sticky bottom-0 grid shrink-0 grid-cols-2 gap-2 border-t border-[#EEF2E8] bg-white px-5 py-3 pb-[calc(20px+env(safe-area-inset-bottom))]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => copyShareText(shareTopic)}
                  className="h-[52px] rounded-full text-[13px] font-black"
                >
                  <Copy className="mr-1 h-4 w-4" />
                  {copyMessage === '已复制' ? '已复制' : '复制文字'}
                </Button>
                <Button
                  type="button"
                  onClick={() => saveShareCard(shareTopic)}
                  disabled={isSavingShareCard}
                  className="h-[52px] rounded-full bg-emerald-700 text-[13px] font-black text-white hover:bg-emerald-800"
                >
                  {isSavingShareCard ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
                  {isSavingShareCard ? '生成中...' : '保存图片'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CareImage({ topic, className, showPreviewHint = false }: { topic: CareTopic; className: string; showPreviewHint?: boolean }) {
  const Icon = categoryIconMap[topic.category] || HelpCircle;
  const image = getCareImage(topic);
  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-[#F7F4EC] ${className}`}>
      {image ? (
        <>
          <img src={image} alt={topic.title} className="h-full w-full object-contain p-1.5" loading="lazy" />
          {showPreviewHint && (
            <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-black text-white backdrop-blur-sm">
              <Maximize2 className="h-3 w-3" />
              查看大图
            </span>
          )}
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-emerald-50 text-emerald-700/45">
          <Icon className="h-8 w-8" />
        </div>
      )}
    </div>
  );
}

function CareShareCardPreview({
  topic,
  cardRef,
}: {
  topic: CareTopic;
  cardRef: RefObject<HTMLDivElement | null>;
}) {
  const careCard = buildCareCard(topic);
  return (
    <div
      ref={cardRef}
      data-care-share-card
      className="mx-auto w-full max-w-[420px] rounded-[28px] bg-[#FFFDF8] p-6 text-left shadow-[0_18px_46px_rgba(39,54,45,0.12)] ring-1 ring-[#F1E9D8]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[13px] font-black text-emerald-800">AquaGuide 养护卡</div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">{careCard.subtitle}</span>
      </div>
      <div className="mt-2 h-1 w-16 rounded-full bg-emerald-100" />

      <h2 className="mt-5 text-[24px] font-black leading-tight text-ink">{careCard.title}</h2>
      <p className="mt-2 text-[12px] font-medium leading-relaxed text-ink/56">一张给当前情况使用的简洁处理卡。</p>

      <section className="mt-5 rounded-[20px] bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100">
        <div className="text-[12px] font-black text-emerald-800">核心结论</div>
        <p className="mt-1 text-[13px] font-black leading-relaxed text-ink">{careCard.coreSummary}</p>
      </section>

      {careCard.doActions.length > 0 && (
        <CareCardSection title="先做" tone="green">
          {careCard.doActions.map((item, index) => (
            <CareCardChecklistItem key={item.title} index={index + 1} title={item.title} />
          ))}
        </CareCardSection>
      )}

      {careCard.avoidActions.length > 0 && (
        <CareCardSection title="暂时避免" tone="orange">
          {careCard.avoidActions.map((item, index) => (
            <CareCardChecklistItem key={item.title} index={index + 1} title={item.title} description={item.reason} />
          ))}
        </CareCardSection>
      )}

      {careCard.warningSigns.length > 0 && (
        <section className="mt-4 rounded-[20px] bg-amber-50 px-4 py-3 ring-1 ring-amber-100">
          <div className="text-[12px] font-black text-amber-800">异常提醒</div>
          <div className="mt-2 grid gap-2">
            {careCard.warningSigns.map(item => (
              <div key={item.sign} className="text-[11px] font-medium leading-relaxed text-ink/68">
                <span className="font-black text-amber-800">{item.sign}：</span>{item.action}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-4">
        <div className="text-[12px] font-black text-ink/62">适用场景</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {careCard.suitableFor.map(tag => (
            <span key={tag} className="rounded-full bg-[#F4EFE3] px-2.5 py-1 text-[10px] font-black leading-relaxed text-ink/58">{tag}</span>
          ))}
        </div>
      </section>

      <div className="mt-6 flex items-center justify-between border-t border-[#F0E8D7] pt-3">
        <span className="text-[12px] font-black text-emerald-800">{careCard.source}</span>
        <span className="text-[10px] font-bold text-ink/35">aquaguide.local</span>
      </div>
    </div>
  );
}

function CareCardSection({ title, tone, children }: { title: string; tone: 'green' | 'orange'; children: ReactNode }) {
  return (
    <section className="mt-4">
      <div className={`text-[13px] font-black ${tone === 'green' ? 'text-emerald-800' : 'text-orange-800'}`}>{title}</div>
      <div className="mt-2 grid gap-2">
        <div className={`grid gap-2 rounded-[20px] px-3 py-3 ring-1 ${tone === 'green' ? 'bg-emerald-50/50 ring-emerald-100' : 'bg-orange-50/55 ring-orange-100'}`}>
          <div className="contents">{children}</div>
        </div>
      </div>
    </section>
  );
}

function CareCardChecklistItem({
  index,
  title,
  description,
}: {
  index: number;
  title: string;
  description?: string;
}) {
  return (
    <div className="grid grid-cols-[24px_1fr] gap-2 rounded-[15px] bg-white px-3 py-2.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-[10px] font-black text-white">{index}</span>
      <span className="min-w-0">
        <span className="block text-[12px] font-black leading-relaxed text-ink">{title}</span>
        {description && <span className="mt-0.5 block text-[11px] font-medium leading-relaxed text-ink/58">{description}</span>}
      </span>
    </div>
  );
}

function CareArticleCard({
  topic,
  favorite,
  onClick,
  onToggleFavorite,
}: {
  topic: CareTopic;
  favorite: boolean;
  onClick: () => void;
  onToggleFavorite: (source: HTMLElement) => void;
}) {
  return (
    <article className="group relative overflow-hidden rounded-[20px] bg-white p-3 text-left shadow-sm ring-1 ring-border/70">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleFavorite(event.currentTarget);
        }}
        className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/88 shadow-sm backdrop-blur-sm transition-transform active:scale-90 ${
          favorite ? 'text-rose-500' : 'text-ink/35'
        }`}
        aria-label={favorite ? '取消收藏' : '收藏百科'}
      >
        <Heart className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`} />
      </button>
      <button type="button" onClick={onClick} className="grid min-h-[136px] w-full grid-cols-[120px_1fr] gap-3.5 text-left transition-transform active:scale-[0.99] max-[360px]:grid-cols-1">
        <span data-care-card-image>
          <CareImage topic={topic} className="h-[120px] w-[120px] rounded-[16px] max-[360px]:h-[180px] max-[360px]:w-full" />
        </span>
        <span className="min-w-0 pr-8 max-[360px]:pr-0">
          <span className="line-clamp-2 block text-[15px] font-black leading-snug text-ink">{getDisplayTitle(topic)}</span>
          <span className="mt-1.5 line-clamp-2 block text-[12px] font-medium leading-relaxed text-ink/56">{topic.summary}</span>
          <span className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-bg px-2 py-1 text-[10px] font-black text-ink/45">{topic.category}</span>
            {getPriorityBadge(topic) && (
              <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">
                {getPriorityBadge(topic)?.label}
              </span>
            )}
          </span>
        </span>
      </button>
    </article>
  );
}

function CareArticleDetail({
  topic,
  scrollRef,
  checkedActions,
  checkedSymptoms,
  favorite,
  onToggleAction,
  onToggleSymptom,
  onStartDiagnosis,
  onToggleFavorite,
  onOpenShare,
  onPreview,
  onSelectRelated,
}: {
  topic: CareTopic;
  scrollRef: RefObject<HTMLDivElement | null>;
  checkedActions: string[];
  checkedSymptoms: string[];
  favorite: boolean;
  onToggleAction: (value: string) => void;
  onToggleSymptom: (value: string) => void;
  onStartDiagnosis: () => void;
  onToggleFavorite: (source: HTMLElement) => void;
  onOpenShare: () => void;
  onPreview: () => void;
  onSelectRelated: (topic: CareTopic) => void;
}) {
  const priority = getPriorityBadge(topic);
  const careGuide = buildCareGuide(topic);
  const visibleActions = careGuide.todayActions;
  const completedVisibleActions = checkedActions.filter(item => visibleActions.some(action => action.description === item)).length;
  const judgementQuestions = getJudgementQuestions(topic);
  const relatedTopics = getRelatedTopics(topic);

  return (
    <div className="flex max-h-[88vh] flex-col bg-white">
      <div ref={scrollRef} className="app-scrollbar-hidden min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-4 pb-32 pt-8">
          <button type="button" onClick={onPreview} data-care-detail-hero className="block w-full" aria-label={`查看${topic.title}大图`}>
            <CareImage topic={topic} className="h-[260px] w-full rounded-[20px]" showPreviewHint />
          </button>

          <div className="mt-4">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-bg px-2 py-1 text-[10px] font-black text-ink/50">{topic.category}</span>
              {priority && <span className={`rounded-full px-2 py-1 text-[10px] font-black ${priority.className}`}>{priority.label}</span>}
            </div>
            <div className="flex items-start gap-2">
              <h2 className="min-w-0 flex-1 text-[21px] font-black leading-tight text-ink">{careGuide.title}</h2>
              <button
                type="button"
                onClick={(event) => onToggleFavorite(event.currentTarget)}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg transition-colors ${
                  favorite ? 'text-rose-500' : 'text-ink/35'
                }`}
                aria-label={favorite ? '取消收藏' : '收藏百科'}
              >
                <Heart className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`} />
              </button>
            </div>
            <section className="mt-3 rounded-[18px] border border-emerald-100 bg-emerald-50/55 p-3">
              <div className="text-[12px] font-black text-emerald-800">核心结论</div>
              <p className="mt-1 text-[14px] font-black leading-relaxed text-ink">{careGuide.summary}</p>
              <p className="mt-2 text-[12px] font-medium leading-relaxed text-emerald-900/62">
                适用场景：{careGuide.suitableFor}
              </p>
            </section>
          </div>

          {judgementQuestions.length > 0 && (
            <section className="mt-4 rounded-[18px] border border-sky-100 bg-sky-50/35 p-3">
              <div className="mb-2">
                <div className="text-[13px] font-black text-ink">先判断</div>
                <div className="mt-0.5 text-[11px] font-medium text-ink/45">先按肉眼观察回答，不需要专业水质数据。</div>
              </div>
              <div className="grid gap-2">
                {judgementQuestions.map(question => {
                  const selectedAnswer = ['没有', '偶尔', '经常', '不确定'].find(option => checkedSymptoms.includes(`${question.source}:${option}`));
                  return (
                    <div key={question.id} className="rounded-[15px] bg-white p-3 shadow-sm">
                      <div className="text-[12px] font-black leading-relaxed text-ink">{question.question}</div>
                      <div className="mt-2 grid grid-cols-4 gap-1.5">
                        {['没有', '偶尔', '经常', '不确定'].map(option => {
                          const isSelected = selectedAnswer === option;
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => onToggleSymptom(`${question.source}:${option}`)}
                              className={`h-8 rounded-full border text-[11px] font-black transition-colors ${
                                isSelected
                                  ? 'border-sky-600 bg-sky-600 text-white'
                                  : 'border-border bg-bg text-ink/55'
                              }`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="mt-3 rounded-[18px] border border-emerald-100 bg-emerald-50/45 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <div className="text-[13px] font-black text-emerald-800">今日建议</div>
                <div className="mt-0.5 text-[11px] font-medium text-emerald-900/50">选择现在能完成的动作，处理节奏尽量轻。</div>
              </div>
              {completedVisibleActions > 0 && (
                <div className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-emerald-700">
                  已完成 {completedVisibleActions}/{visibleActions.length}
                </div>
              )}
            </div>
            <div className="mt-2 grid gap-1.5">
              {visibleActions.map(item => (
                <ActionStepCard
                  key={`${item.title}-${item.description}`}
                  checked={checkedActions.includes(item.description)}
                  title={item.title}
                  description={item.description}
                  onClick={() => onToggleAction(item.description)}
                />
              ))}
            </div>
          </section>

          {careGuide.avoidActions.length > 0 && (
            <section className="mt-3 rounded-[18px] border border-orange-100 bg-orange-50/45 p-3">
              <div className="mb-2">
                <div className="text-[13px] font-black text-orange-800">暂时避免</div>
                <div className="mt-0.5 text-[11px] font-medium text-orange-900/55">每条都附带原因和替代做法，方便判断轻重。</div>
              </div>
              <div className="grid gap-2">
                {careGuide.avoidActions.map(item => (
                  <div key={item.title} className="rounded-[15px] border border-orange-100 bg-white px-3 py-3">
                    <div className="text-[12px] font-black leading-relaxed text-orange-800">{item.title}</div>
                    <div className="mt-2 grid gap-1.5 text-[11px] font-medium leading-relaxed text-ink/66">
                      <p><span className="font-black text-orange-800">原因：</span>{item.reason}</p>
                      <p><span className="font-black text-orange-800">可能影响：</span>{item.consequence}</p>
                      <p><span className="font-black text-emerald-800">替代做法：</span>{item.alternative}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-3 rounded-[18px] border border-amber-100 bg-amber-50/45 p-3">
            <div className="mb-2">
              <div className="text-[13px] font-black text-amber-800">异常情况处理</div>
              <div className="mt-0.5 text-[11px] font-medium text-amber-900/55">出现下面状态时，先按轻量处理排查。</div>
            </div>
            <div className="grid gap-2">
              {careGuide.warningSigns.map(item => (
                <div key={item.sign} className="rounded-[15px] bg-white px-3 py-3">
                  <div className="flex items-center gap-2 text-[12px] font-black text-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>{item.sign}</span>
                  </div>
                  <div className="mt-2 grid gap-1.5 text-[11px] font-medium leading-relaxed text-ink/66">
                    <p><span className="font-black text-amber-800">可能原因：</span>{item.possibleReason}</p>
                    <p><span className="font-black text-emerald-800">处理方式：</span>{item.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-3 rounded-[18px] border border-border bg-white p-3">
            <details>
              <summary className="cursor-pointer list-none text-[13px] font-black text-ink">
                详细说明
              </summary>
              <div className="mt-3 grid gap-2">
                {careGuide.maintenanceTips.map(item => (
                  <div key={`${item.title}-${item.description}`} className="rounded-[14px] bg-bg px-3 py-2.5">
                    <div className="text-[12px] font-black text-ink/76">{item.title}</div>
                    <p className="mt-1 text-[11px] font-medium leading-relaxed text-ink/60">{item.description}</p>
                  </div>
                ))}
              </div>
            </details>
          </section>

          {relatedTopics.length > 0 && (
            <section className="mt-3 rounded-[18px] border border-border bg-white p-3">
              <div className="mb-2 text-[12px] font-black text-ink">相关问题</div>
              <div className="grid gap-1.5">
                {relatedTopics.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectRelated(item)}
                    className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-[13px] bg-bg px-3 py-2 text-left transition-colors hover:bg-emerald-50"
                  >
                    <span className="min-w-0">
                      <span className="line-clamp-1 block text-[12px] font-black text-ink/76">{getDisplayTitle(item)}</span>
                      <span className="mt-0.5 line-clamp-1 block text-[10px] font-medium text-ink/45">{item.summary || '查看这个问题的处理方法。'}</span>
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink/35" />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-white/95 p-3 pb-[calc(12px+env(safe-area-inset-bottom))] shadow-[0_-12px_30px_rgba(15,23,42,0.08)]">
        <div className="grid gap-2">
          <Button
            type="button"
            onClick={onStartDiagnosis}
            className="h-11 w-full rounded-full bg-emerald-700 text-sm font-black text-white hover:bg-emerald-800"
          >
            一键诊断这个问题
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onOpenShare}
            className="h-10 w-full rounded-full border-emerald-100 bg-white text-sm font-black text-emerald-700 hover:bg-emerald-50"
          >
            生成养护卡
          </Button>
        </div>
      </div>
    </div>
  );
}

function ActionStepCard({
  checked,
  title,
  description,
  onClick,
}: {
  checked: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-2 rounded-[15px] border px-3 py-2.5 text-left transition-colors ${
        checked ? 'border-emerald-200 bg-white text-ink/58' : 'border-white bg-white text-ink'
      }`}
    >
      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
        checked ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-border text-transparent'
      }`}>
        <Check className="h-3 w-3" />
      </span>
      <span className="min-w-0">
        <span className={`block text-[12px] font-black leading-tight ${checked ? 'text-emerald-700' : 'text-ink'}`}>{title}</span>
        {description && <span className="mt-1 block text-[11px] font-medium leading-relaxed text-ink/58">{description}</span>}
      </span>
    </button>
  );
}
