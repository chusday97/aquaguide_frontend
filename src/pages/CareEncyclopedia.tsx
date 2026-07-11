import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent, ReactNode, RefObject } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, Baby, Check, ChevronRight, Copy, Download, Droplets, Fish, Heart, HelpCircle, Loader2, Maximize2, Search, Settings, Stethoscope, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { careTopicsData, type CareTopic } from '../data/careTopicsData';
import { fishData } from '../data/fishData';
import type { PreviewImage } from '../components/common/ImagePreviewModal';
import type { Aquarium, AquariumFish, Fish as FishType } from '../types';
import { getLifeType } from '../modules/species/species.service';
import { loadAppStateFromStorage } from '../services/storage/local-app-state';
import { useWorkspaceNavigation } from '../components/layout/WorkspaceNavigationProvider';
import {
  getCareFavorites,
  subscribeToFavorites,
  toggleCareFavorite,
  type CareFavoriteMap,
} from '../services/favorites/favorites.service';

const ImagePreviewModal = lazy(() => import('../components/common/ImagePreviewModal').then(module => ({ default: module.ImagePreviewModal })));
const FilterBottomSheet = lazy(() => import('../components/common/FilterBottomSheet').then(module => ({ default: module.FilterBottomSheet })));

const categoryChips = ['全部', '鱼不舒服', '水变差', '新鱼入缸', '日常喂食', '换水维护', '怀孕 / 鱼苗', '死亡处理', '设备问题'];
const bannerTopicIds = ['guide_water_deteriorate', 'guide_new_fish_acclimation', 'guide_safe_water_change'];
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
type StepDiagnosisIssue = 'gasping' | 'refusal' | 'hiding' | 'aggression' | 'death' | 'cloudy' | 'shrimpDeath' | 'plantProblem';
type StepDiagnosisAnswerValue = 'none' | 'occasional' | 'frequent' | 'unknown' | 'mild' | 'obvious' | 'small' | 'large' | 'yes';
type StepDiagnosisAnswers = {
  gasping?: StepDiagnosisAnswerValue;
  cloudyWater?: StepDiagnosisAnswerValue;
  recentWaterChange?: StepDiagnosisAnswerValue;
  recentNewLivestock?: StepDiagnosisAnswerValue;
  abnormalBehavior?: StepDiagnosisAnswerValue;
};
type StepDiagnosisResult = {
  riskLevel: 'low' | 'medium' | 'high' | 'unknown';
  riskLabel: string;
  conclusion: string;
  causes: string[];
  todayActions: string[];
  avoidActions: string[];
  observeItems: string[];
  evidence: string[];
};
type StepDiagnosisState = {
  issueType: StepDiagnosisIssue;
  currentStep: number;
  questionIndex: number;
  answers: StepDiagnosisAnswers;
  targetAquariumId: string;
  result: StepDiagnosisResult | null;
};
type CareUrgencyTag = '科普了解' | '入缸前准备' | '观察为主' | '阶段护理' | '建议尽快处理' | '需要立即处理' | '谨慎操作';
type CareGuideType = 'diagnosis' | 'procedure' | 'careChecklist' | 'knowledge' | 'reminder';
type CareActionLevel = '日常学习' | '操作指南' | '建议关注' | '立即排查';
type CareHomeMeta = {
  topicTags: string[];
  actionLevel: CareActionLevel;
  ctaLabel: string;
};
type CareGuideMeta = {
  topicTags: string[];
  urgencyTag: CareUrgencyTag;
  guideType: CareGuideType;
  ctaLabel: string;
  secondaryCtaLabel?: string;
  relatedIssueType?: StepDiagnosisIssue;
};
type ProcedureStep = { title: string; description: string };
type ProcedureReminder = { title: string; reason: string };
type ProcedureDetail = { title: string; description: string };

const safeJsonParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
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

const isNewFishAcclimationTopic = (topic: CareTopic) => (
  topic.id === 'guide_new_fish_acclimation' || /新鱼|入缸|过水/.test(`${topic.title} ${topic.summary} ${topic.keywords.join(' ')}`)
);

const getProcedureSteps = (topic: CareTopic): ProcedureStep[] => {
  if (isNewFishAcclimationTopic(topic)) {
    return [
      { title: '浮温', description: '袋子浮在鱼缸水面 15-30 分钟，让水温接近。' },
      { title: '少量混水', description: '每隔 5-10 分钟加入少量鱼缸水，重复 3-4 次。' },
      { title: '捞鱼入缸', description: '只把鱼捞入鱼缸，袋里的水倒掉，不要倒入主缸。' },
    ];
  }
  return topic.firstSteps.slice(0, 4).map(item => {
    const action = splitActionText(item);
    return {
      title: action.title,
      description: action.description || cleanCareSentence(item),
    };
  });
};

const getProcedureReminders = (topic: CareTopic): ProcedureReminder[] => {
  if (isNewFishAcclimationTopic(topic)) {
    return [
      { title: '不要倒袋水入缸', reason: '袋水可能带入污染物，也会造成水质波动。' },
      { title: '不要立刻入缸', reason: '温差和 pH 波动可能导致应激。' },
      { title: '入缸初期避免强光', reason: '保持安静，减少惊吓。' },
    ];
  }
  return buildAvoidActions(topic).slice(0, 3).map(item => ({
    title: item.title,
    reason: item.reason,
  }));
};

const getProcedureDetails = (topic: CareTopic): ProcedureDetail[] => {
  if (isNewFishAcclimationTopic(topic)) {
    return [
      { title: '为什么要浮温', description: '运输袋和鱼缸的水温可能不同。先浮温可以减少温差刺激。' },
      { title: '为什么要少量混水', description: '少量多次混水，可以让新鱼逐步适应 pH、硬度和气味变化。' },
      { title: '为什么不能倒袋水', description: '袋水里可能有排泄物、药物残留和运输污染物，不适合进入主缸。' },
      { title: '入缸后观察 3-7 天', description: '观察白点、烂鳍、拒食、夹鳍和异常躲藏。稳定后再考虑混养。' },
    ];
  }
  return [
    ...topic.diagnoseWhen.map(item => ({ title: '后续观察', description: cleanCareSentence(item) })),
    ...(topic.nextStep ? [{ title: '下一步', description: cleanCareSentence(topic.nextStep) }] : []),
  ].filter((item, index, list) => item.description && list.findIndex(other => other.description === item.description) === index);
};

const getProcedureObservation = (topic: CareTopic) => (
  isNewFishAcclimationTopic(topic)
    ? '新鱼建议先隔离观察 3-7 天。确认无白点、烂鳍、拒食等异常后，再放入主缸。'
    : cleanCareSentence(topic.nextStep || topic.diagnoseWhen[0] || '完成后继续观察鱼只状态、水温和水体变化。')
);

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
  const maintenanceTips = isNewFishAcclimationTopic(topic)
    ? [{ title: '入缸后观察', description: getProcedureObservation(topic) }]
    : [
      ...topic.observe.map(item => ({ title: '观察重点', description: cleanCareSentence(item) })),
      ...topic.diagnoseWhen.map(item => ({ title: '后续判断', description: cleanCareSentence(item) })),
      ...(topic.nextStep ? [{ title: '下一步', description: cleanCareSentence(topic.nextStep) }] : []),
    ]
      .filter(item => item.description)
      .filter((item, index, list) => list.findIndex(other => other.description === item.description) === index);

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

const relatedScenarioGroups: Array<{ name: string; pattern: RegExp }> = [
  { name: 'new_fish', pattern: /新鱼|入缸|过水|检疫|隔离|拒食|适应/ },
  { name: 'water', pattern: /水质|水浑|白浊|发白|发绿|异味|油膜|换水|过滤|氨氮|亚硝酸盐/ },
  { name: 'breeding', pattern: /怀孕|母鱼|鱼苗|繁殖|产后|开口|平游|卵黄囊/ },
  { name: 'death', pattern: /死亡|死鱼|暴毙|隔离|捞出|水质检测/ },
  { name: 'symptom', pattern: /浮头|呼吸|拒食|趴缸|躲藏|打架|追咬|白点|烂尾|红鳃/ },
  { name: 'equipment', pattern: /设备|过滤|滤材|加热棒|气泵|灯光|水流/ },
  { name: 'plant', pattern: /水草|黄叶|烂叶|藻|CO2|光照|草缸/ },
];

const getRelatedScenarioKeys = (topic: CareTopic) => {
  const text = `${getDisplayTitle(topic)} ${topic.title} ${topic.category} ${topic.summary} ${topic.keywords.join(' ')}`;
  return relatedScenarioGroups.filter(group => group.pattern.test(text)).map(group => group.name);
};

const getAquariumRelatedBoosts = (aquarium: Aquarium | null | undefined) => {
  const livestock = aquarium?.fishes || [];
  const details = livestock
    .map(item => fishData.find(fish => fish.id === item.fishId))
    .filter((fish): fish is FishType => Boolean(fish));
  const now = Date.now();
  const hasRecentLivestock = livestock.some(item => {
    const addedAt = new Date(item.entryDate).getTime();
    return Number.isFinite(addedAt) && now - addedAt < 14 * 24 * 60 * 60 * 1000;
  });
  const hasBreedingSpecies = details.some(fish => /孔雀|玛丽|月光|胎生|鱼苗|虾/.test(`${fish.name} ${fish.category} ${fish.description}`));
  const isNewTank = Boolean(aquarium) && (!aquarium?.lastWaterChangeDate && (aquarium?.waterChangeHistory || []).length === 0);
  const hasEquipmentGap = Boolean(aquarium && (!aquarium.equipment?.filter || aquarium.equipment.filter === '无'));
  return {
    new_fish: hasRecentLivestock ? 3 : 0,
    water: isNewTank ? 2 : 0,
    breeding: hasBreedingSpecies ? 3 : 0,
    equipment: hasEquipmentGap ? 2 : 0,
  };
};

const getRelatedCareGuides = (currentGuide: CareTopic, allGuides: CareTopic[], activeAquarium?: Aquarium | null) => {
  const currentMeta = getCareGuideMeta(currentGuide);
  const currentHomeMeta = getCareHomeMeta(currentGuide);
  const currentScenarios = getRelatedScenarioKeys(currentGuide);
  const currentKeywords = new Set(currentGuide.keywords.map(keyword => keyword.trim()).filter(Boolean));
  const aquariumBoosts = getAquariumRelatedBoosts(activeAquarium);

  return allGuides
    .filter(item => item.id !== currentGuide.id)
    .map(item => {
      const meta = getCareGuideMeta(item);
      const homeMeta = getCareHomeMeta(item);
      const scenarioKeys = getRelatedScenarioKeys(item);
      const sharedTopicTags = meta.topicTags.filter(tag => currentMeta.topicTags.includes(tag)).length
        + homeMeta.topicTags.filter(tag => currentHomeMeta.topicTags.includes(tag)).length;
      const sharedKeywords = item.keywords.filter(keyword => currentKeywords.has(keyword)).length;
      const sharedScenarios = scenarioKeys.filter(key => currentScenarios.includes(key)).length;
      const aquariumBoost = scenarioKeys.reduce((sum, key) => sum + ((aquariumBoosts as Record<string, number>)[key] || 0), 0);
      const guideTypeScore = meta.guideType === currentMeta.guideType ? 2 : (
        currentMeta.guideType === 'procedure' && meta.guideType === 'diagnosis' ? 1 :
        currentMeta.guideType === 'diagnosis' && ['procedure', 'knowledge'].includes(meta.guideType) ? 1 :
        currentMeta.guideType === 'careChecklist' && meta.guideType === 'procedure' ? 1 : 0
      );
      const score = sharedTopicTags * 5 + sharedKeywords * 2 + sharedScenarios * 6 + guideTypeScore + aquariumBoost;
      return { item, score };
    })
    .filter(({ score }) => score >= 6)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ item }) => item);
};

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

const urgencyTagClassMap: Record<CareUrgencyTag, string> = {
  科普了解: 'bg-slate-100 text-slate-700',
  入缸前准备: 'bg-cyan-50 text-cyan-700',
  观察为主: 'bg-emerald-50 text-emerald-700',
  阶段护理: 'bg-violet-50 text-violet-700',
  建议尽快处理: 'bg-orange-100 text-orange-700',
  需要立即处理: 'bg-red-600 text-white',
  谨慎操作: 'bg-yellow-100 text-yellow-800',
};

const actionLevelClassMap: Record<CareActionLevel, string> = {
  日常学习: 'bg-slate-100 text-slate-700',
  操作指南: 'bg-emerald-50 text-emerald-700',
  建议关注: 'bg-orange-100 text-orange-700',
  立即排查: 'bg-red-600 text-white',
};

const actionLevelCtaMap: Record<CareActionLevel, string> = {
  日常学习: '查看内容',
  操作指南: '查看内容',
  建议关注: '查看内容',
  立即排查: '查看内容',
};

const careCategoryEntrances: Array<{ label: string; filter: string; icon: typeof Droplets; hint: string }> = [
  { label: '水质问题', filter: '水质异常', icon: Droplets, hint: '水浑 / 异味 / 波动' },
  { label: '新鱼入缸', filter: '新鱼入缸', icon: Stethoscope, hint: '过水 / 检疫 / 放养' },
  { label: '鱼只异常', filter: '鱼只异常', icon: Fish, hint: '浮头 / 拒食 / 体表' },
  { label: '设备维护', filter: '设备维护', icon: Settings, hint: '过滤 / 打氧 / 灯光' },
  { label: '怀孕 / 鱼苗', filter: '鱼苗养护', icon: Baby, hint: '繁殖 / 开口 / 隔离' },
  { label: '日常养护', filter: '日常养护', icon: Waves, hint: '换水 / 喂食 / 清洁' },
];

const highFrequencyFilters = ['全部', '新手必看', '水质问题', '鱼类症状', '喂食管理', '设备维护'];

const highFrequencyFilterToCategory: Record<string, string> = {
  全部: '全部',
  新手必看: '新手必看',
  水质问题: '水质异常',
  鱼类症状: '鱼只异常',
  喂食管理: '喂食管理',
  设备维护: '设备维护',
};

const sceneEntrances = [
  { label: '新鱼入缸', subtitle: '过水 / 放养', filter: '新鱼入缸' },
  { label: '水质异常', subtitle: '浑水 / 异味', filter: '水质异常' },
  { label: '怀孕 / 鱼苗', subtitle: '产卵 / 孵化', filter: '鱼苗养护' },
  { label: '设备维护', subtitle: '清洗 / 保养', filter: '设备维护' },
  { label: '鱼只异常', subtitle: '浮头 / 拒食 / 死鱼', filter: '鱼只异常' },
];

const getCareHomeMeta = (topic: CareTopic): CareHomeMeta => {
  const guideMeta = getCareGuideMeta(topic);
  const displayTitle = getDisplayTitle(topic);
  const text = `${displayTitle} ${topic.title} ${topic.category} ${topic.keywords.join(' ')}`;
  let topicTags = guideMeta.topicTags.map(tag => (
    tag === '怀孕 / 鱼苗' ? '繁殖护理' : tag
  ));
  let actionLevel: CareActionLevel = '日常学习';

  if (topic.id === 'guide_safe_water_change') {
    topicTags = ['日常养护'];
    actionLevel = '操作指南';
  } else if (topic.id === 'guide_new_fish_acclimation') {
    topicTags = ['新鱼入缸'];
    actionLevel = '操作指南';
  } else if (topic.id === 'guide_water_deteriorate') {
    topicTags = ['水质异常'];
    actionLevel = '建议关注';
  } else if (topic.id === 'guide_fish_death_action') {
    topicTags = ['鱼只异常'];
    actionLevel = '立即排查';
  } else if (topic.id === 'guide_fry_care') {
    topicTags = ['鱼苗养护'];
    actionLevel = '操作指南';
  } else if (/新缸.*白|白蒙蒙|白浊/.test(text)) {
    topicTags = ['水质异常'];
    actionLevel = '建议关注';
  } else if (/过水|入缸|换水|清洗|操作|步骤|鱼苗|怀孕|繁殖/.test(text) || guideMeta.guideType === 'procedure' || guideMeta.guideType === 'careChecklist') {
    actionLevel = '操作指南';
  } else if (/死亡|死鱼|浮头|急促|氨中毒|白点|烂尾|红鳃|暴毙/.test(text)) {
    actionLevel = '立即排查';
  } else if (/水质|水浑|发白|发绿|异味|油膜|过滤|设备|硬度|pH|混养/.test(text) || topic.urgency === '尽快处理') {
    actionLevel = '建议关注';
  }

  if (topicTags.length === 0) topicTags = ['日常养护'];

  return {
    topicTags: topicTags.slice(0, 1),
    actionLevel,
    ctaLabel: actionLevelCtaMap[actionLevel],
  };
};

type CareRecommendation = {
  topic: CareTopic;
  reason: string;
};

const findCareTopic = (matcher: (topic: CareTopic) => boolean) => careTopicsData.find(matcher);

const getCareRecommendations = (aquarium: Aquarium | null, allGuides: CareTopic[]): CareRecommendation[] => {
  const recommendations: CareRecommendation[] = [];
  const addRecommendation = (topic: CareTopic | undefined, reason: string) => {
    if (!topic || recommendations.some(item => item.topic.id === topic.id)) return;
    recommendations.push({ topic, reason });
  };

  const livestock = aquarium?.fishes || [];
  const livestockDetails = livestock
    .map(item => fishData.find(fish => fish.id === item.fishId))
    .filter((fish): fish is FishType => Boolean(fish));
  const now = Date.now();
  const hasRecentLivestock = livestock.some(item => {
    const addedTime = new Date(item.entryDate).getTime();
    return Number.isFinite(addedTime) && now - addedTime < 14 * 24 * 60 * 60 * 1000;
  });
  const hasWaterChangeRecord = Boolean(aquarium?.lastWaterChangeDate || (aquarium?.waterChangeHistory || []).length > 0);
  const isNewTank = Boolean(aquarium) && (!hasWaterChangeRecord || livestock.length === 0);
  const hasBreedingSpecies = livestockDetails.some(fish => /孔雀|玛丽|月光|胎生|鱼苗|虾/.test(`${fish.name} ${fish.category} ${fish.description}`));
  const hasFilter = Boolean(aquarium?.equipment?.filter && aquarium.equipment.filter !== '无');

  if (hasRecentLivestock) {
    addRecommendation(findCareTopic(topic => topic.id === 'guide_new_fish_acclimation'), '当前鱼缸最近新增了生物，优先确认过水和入缸观察。');
  }
  if (isNewTank) {
    addRecommendation(findCareTopic(topic => /白蒙蒙|白浊|新缸刚放水/.test(getDisplayTitle(topic) + topic.summary)), '当前鱼缸像新缸状态，先看白浊和开缸稳定问题。');
  }
  if (hasBreedingSpecies) {
    addRecommendation(findCareTopic(topic => topic.id === 'guide_fry_care' || topic.id === 'guide_pregnant_care'), '当前鱼缸有繁殖或鱼苗相关生物，建议提前看护理节奏。');
  }
  if (!hasFilter && aquarium) {
    addRecommendation(findCareTopic(topic => /过滤|滤棉|过滤器/.test(getDisplayTitle(topic) + topic.summary + topic.keywords.join(' '))), '当前鱼缸设备信息不完整，建议先确认过滤和维护方式。');
  }
  if ((aquarium?.waterChangeHistory || []).length === 0) {
    addRecommendation(findCareTopic(topic => topic.id === 'guide_safe_water_change'), '当前暂无换水记录，建议建立稳定换水流程。');
  }

  addRecommendation(findCareTopic(topic => topic.id === 'guide_water_deteriorate'), aquarium ? '作为日常兜底，水质异常排查最常用。' : '还没有当前鱼缸数据，先推荐通用水质排查。');
  addRecommendation(findCareTopic(topic => topic.id === 'guide_new_fish_acclimation'), '新鱼、新虾入缸前后都适合快速复查。');
  addRecommendation(findCareTopic(topic => topic.id === 'guide_safe_water_change'), '基础养护高频内容，适合建立固定流程。');
  addRecommendation(allGuides.find(topic => /喂食|残饵/.test(getDisplayTitle(topic) + topic.keywords.join(' '))), '日常喂食和残饵管理会影响水质稳定。');

  return recommendations.slice(0, 5);
};

const getCareGuideMeta = (topic: CareTopic): CareGuideMeta => {
  const displayTitle = getDisplayTitle(topic);
  const text = `${displayTitle} ${topic.title} ${topic.category} ${topic.summary} ${topic.keywords.join(' ')}`;
  const topicTags = new Set<string>();
  const addTag = (tag: string) => topicTags.add(tag);

  if (/新鱼|入缸|过水|检疫/.test(text)) addTag('新鱼入缸');
  if (/水质|水浑|白浊|发白|发绿|异味|油膜|氨氮|亚硝酸盐/.test(text)) addTag('水质异常');
  if (/浮头|呼吸|拒食|趴缸|白点|烂尾|鱼只异常|疾病|生病/.test(text)) addTag('鱼只异常');
  if (/怀孕|母鱼|繁殖/.test(text)) addTag('怀孕 / 鱼苗');
  if (/鱼苗|开口|平游|卵黄囊/.test(text)) addTag('鱼苗养护');
  if (/过滤|加热棒|气泵|灯|设备/.test(text)) addTag('设备维护');
  if (/混养|追咬|打架|攻击/.test(text)) addTag('混养冲突');
  if (/水草|草缸|造景|CO2|黄叶|烂叶|藻/.test(text)) addTag('草缸配置');
  if (/换水|清洁|喂食|残饵|日常/.test(text)) addTag('日常养护');
  if (topicTags.size === 0) addTag(topic.category || '日常养护');

  if (/过水|新鱼入缸|检疫/.test(text)) {
    return {
      topicTags: Array.from(topicTags).slice(0, 2),
      urgencyTag: '入缸前准备',
      guideType: 'procedure',
      ctaLabel: '设置 3 天观察提醒',
      secondaryCtaLabel: '标记已完成过水',
      relatedIssueType: 'gasping',
    };
  }

  if (/怀孕|母鱼|鱼苗|繁殖|开口|平游|卵黄囊/.test(text)) {
    return {
      topicTags: Array.from(topicTags).slice(0, 2),
      urgencyTag: '阶段护理',
      guideType: 'careChecklist',
      ctaLabel: '保存护理清单',
      secondaryCtaLabel: '加入阶段提醒',
      relatedIssueType: 'gasping',
    };
  }

  if (topic.id === 'guide_water_deteriorate' || /水质变差/.test(text)) {
    return {
      topicTags: Array.from(topicTags).slice(0, 2),
      urgencyTag: '建议尽快处理',
      guideType: 'diagnosis',
      ctaLabel: '开始问题自查',
      relatedIssueType: 'cloudy',
    };
  }

  if (/浮头|呼吸急促|急性|死亡|暴毙|氨中毒|烂尾|白点|红鳃/.test(text) || topic.urgency === '高优先级') {
    return {
      topicTags: Array.from(topicTags).slice(0, 2),
      urgencyTag: '需要立即处理',
      guideType: 'diagnosis',
      ctaLabel: '开始问题自查',
      relatedIssueType: inferStepDiagnosisIssue(topic),
    };
  }

  if (/水质变差|水浑|发白|发绿|异味|过滤器不出水|设备异常|死鱼/.test(text) || topic.urgency === '尽快处理') {
    return {
      topicTags: Array.from(topicTags).slice(0, 2),
      urgencyTag: '建议尽快处理',
      guideType: 'diagnosis',
      ctaLabel: '开始问题自查',
      relatedIssueType: inferStepDiagnosisIssue(topic),
    };
  }

  if (/换水|清洗过滤|清洁|喂食|残饵/.test(text)) {
    return {
      topicTags: Array.from(topicTags).slice(0, 2),
      urgencyTag: /大换水|下药|滤材/.test(text) ? '谨慎操作' : '观察为主',
      guideType: 'procedure',
      ctaLabel: /换水/.test(text) ? '标记已完成换水' : '标记已完成操作',
      secondaryCtaLabel: '展开完整说明',
      relatedIssueType: inferStepDiagnosisIssue(topic),
    };
  }

  return {
    topicTags: Array.from(topicTags).slice(0, 2),
    urgencyTag: /用药|除藻|硬度|pH|CO2/.test(text) ? '谨慎操作' : '科普了解',
    guideType: 'knowledge',
    ctaLabel: '收藏文章',
    secondaryCtaLabel: '展开完整说明',
    relatedIssueType: inferStepDiagnosisIssue(topic),
  };
};

const matchesChip = (topic: CareTopic, chip: string) => {
  const homeMeta = getCareHomeMeta(topic);
  const haystack = `${getDisplayTitle(topic)} ${topic.title} ${topic.category} ${homeMeta.topicTags.join(' ')} ${homeMeta.actionLevel} ${topic.keywords.join(' ')}`;
  if (chip === '全部') return true;
  if (chip === '急救') return homeMeta.actionLevel === '立即排查' || /死|浮头|喘|臭|白点|烂尾|急|异常/.test(haystack);
  if (chip === '鱼不舒服' || chip === '鱼类症状' || chip === '鱼只异常') return /鱼只异常|疾病排查|病|白点|烂尾|趴缸|拒食|浮头|喘|死鱼/.test(haystack);
  if (chip === '水变差' || chip === '水质问题' || chip === '水质异常' || chip === '水质检测') return /水质异常|水质|水浑|白浊|发绿|异味|油膜|氨氮|亚硝酸盐/.test(haystack);
  if (chip === '新鱼入缸' || chip === '入缸') return /入缸|新鱼|过水|检疫/.test(haystack);
  if (chip === '日常喂食' || chip === '喂食' || chip === '喂食管理') return /喂|饲料|吃|残饵/.test(haystack);
  if (chip === '换水维护' || chip === '换水' || chip === '日常养护') return /日常养护|换水|困水|除氯|喂食/.test(haystack);
  if (chip === '怀孕 / 鱼苗' || chip === '鱼苗' || chip === '鱼苗养护' || chip === '繁殖护理') return /鱼苗|怀孕|繁殖|母鱼/.test(haystack);
  if (chip === '死亡处理') return /死亡|死鱼|连续死/.test(haystack);
  if (chip === '设备' || chip === '设备问题' || chip === '设备维护') return /设备维护|设备|过滤|加热棒|气泵|灯/.test(haystack);
  if (chip === '新手必看') return /新手|新缸|入缸|过水|换水|开缸|白浊/.test(haystack);
  return haystack.includes(chip);
};

const stepDiagnosisIssues: Array<{ id: StepDiagnosisIssue; label: string; description: string }> = [
  { id: 'gasping', label: '浮头 / 呼吸急促', description: '排查缺氧、水质波动和短期应激' },
  { id: 'refusal', label: '拒食', description: '排查新鱼应激、喂食压力和水质问题' },
  { id: 'hiding', label: '躲藏不动', description: '排查追咬、温度波动和环境压力' },
  { id: 'aggression', label: '追咬打架', description: '排查领地、密度和躲避空间' },
  { id: 'death', label: '死亡 / 异常死亡', description: '排查急性水质问题和污染风险' },
  { id: 'cloudy', label: '水体浑浊 / 异味', description: '排查残饵、过滤和硝化波动' },
  { id: 'shrimpDeath', label: '虾类死亡', description: '排查换水刺激、用药和蜕壳压力' },
  { id: 'plantProblem', label: '水草黄叶 / 烂叶', description: '排查光照、肥力和适应期' },
];

const stepDiagnosisQuestions: Array<{
  id: keyof StepDiagnosisAnswers;
  question: string;
  options: Array<{ label: string; value: StepDiagnosisAnswerValue }>;
}> = [
  {
    id: 'gasping',
    question: '是否看到鱼浮头或呼吸急促？',
    options: [
      { label: '没有', value: 'none' },
      { label: '偶尔', value: 'occasional' },
      { label: '经常', value: 'frequent' },
      { label: '不确定', value: 'unknown' },
    ],
  },
  {
    id: 'cloudyWater',
    question: '水体是否浑浊或有异味？',
    options: [
      { label: '没有', value: 'none' },
      { label: '有一点', value: 'mild' },
      { label: '明显', value: 'obvious' },
      { label: '不确定', value: 'unknown' },
    ],
  },
  {
    id: 'recentWaterChange',
    question: '最近 48 小时是否换水？',
    options: [
      { label: '没有', value: 'none' },
      { label: '少量换水', value: 'small' },
      { label: '大量换水', value: 'large' },
      { label: '不确定', value: 'unknown' },
    ],
  },
  {
    id: 'recentNewLivestock',
    question: '最近是否新增生物？',
    options: [
      { label: '没有', value: 'none' },
      { label: '有', value: 'yes' },
      { label: '不确定', value: 'unknown' },
    ],
  },
  {
    id: 'abnormalBehavior',
    question: '是否有拒食、躲藏或死亡？',
    options: [
      { label: '没有', value: 'none' },
      { label: '有轻微异常', value: 'mild' },
      { label: '有明显异常', value: 'obvious' },
      { label: '不确定', value: 'unknown' },
    ],
  },
];

const getStepDiagnosisQuestions = (issueType: StepDiagnosisIssue) => {
  const questionIdsByIssue: Record<StepDiagnosisIssue, Array<keyof StepDiagnosisAnswers>> = {
    cloudy: ['cloudyWater', 'recentWaterChange', 'recentNewLivestock'],
    gasping: ['gasping', 'cloudyWater', 'recentWaterChange'],
    death: ['gasping', 'cloudyWater', 'recentWaterChange', 'recentNewLivestock'],
    shrimpDeath: ['recentWaterChange', 'cloudyWater', 'recentNewLivestock'],
    plantProblem: ['cloudyWater', 'recentWaterChange'],
    refusal: ['abnormalBehavior', 'recentNewLivestock', 'cloudyWater'],
    hiding: ['abnormalBehavior', 'recentNewLivestock', 'recentWaterChange'],
    aggression: ['abnormalBehavior', 'recentNewLivestock'],
  };
  const ids = questionIdsByIssue[issueType];
  return ids
    .map(id => stepDiagnosisQuestions.find(question => question.id === id))
    .filter((question): question is (typeof stepDiagnosisQuestions)[number] => Boolean(question));
};

const inferStepDiagnosisIssue = (topic: CareTopic): StepDiagnosisIssue => {
  const text = `${topic.title}${topic.category}${topic.summary}${topic.keywords.join(' ')}`;
  if (/虾/.test(text)) return 'shrimpDeath';
  if (/水草|黄叶|烂叶|藻/.test(text)) return 'plantProblem';
  if (/死亡|死鱼|暴毙/.test(text)) return 'death';
  if (/水质|浑|发白|发绿|异味|臭|油膜/.test(text)) return 'cloudy';
  if (/追咬|打架|攻击|抢食/.test(text)) return 'aggression';
  if (/躲|趴缸|不动/.test(text)) return 'hiding';
  if (/拒食|不吃/.test(text)) return 'refusal';
  if (/浮头|呼吸|喘|缺氧/.test(text)) return 'gasping';
  return 'gasping';
};

const getTankVolumeLiters = (aquarium?: Aquarium | null) => {
  if (!aquarium?.dimensions) return 0;
  const length = Number(aquarium.dimensions.length);
  const width = Number(aquarium.dimensions.width);
  const height = Number(aquarium.dimensions.height);
  if (![length, width, height].every(Number.isFinite)) return 0;
  return Math.round((length * width * height * 0.85) / 1000);
};

const getCurrentLivestock = (aquarium?: Aquarium | null) => (
  (aquarium?.fishes || [])
    .map((aqFish: AquariumFish) => ({ aqFish, fish: fishData.find(item => item.id === aqFish.fishId) }))
    .filter((item): item is { aqFish: AquariumFish; fish: FishType } => {
      if (!item.fish) return false;
      const lifeType = getLifeType(item.fish);
      return lifeType !== 'plant' && lifeType !== 'hardscape';
    })
);

const answerLabelMap: Record<StepDiagnosisAnswerValue, string> = {
  none: '没有',
  occasional: '偶尔',
  frequent: '经常',
  unknown: '不确定',
  mild: '有一点 / 轻微',
  obvious: '明显',
  small: '少量换水',
  large: '大量换水',
  yes: '有',
};

const riskWeight: Record<StepDiagnosisResult['riskLevel'], number> = {
  low: 1,
  unknown: 2,
  medium: 3,
  high: 4,
};

const buildStepDiagnosisResult = ({
  aquarium,
  livestock,
  answers,
  issueType,
}: {
  aquarium: Aquarium | null;
  livestock: Array<{ aqFish: AquariumFish; fish: FishType }>;
  answers: StepDiagnosisAnswers;
  issueType: StepDiagnosisIssue;
}): StepDiagnosisResult => {
  const volumeLiters = getTankVolumeLiters(aquarium);
  const hasShrimp = livestock.some(({ fish }) => /虾|shrimp|neocaridina|caridina/i.test(`${fish.name} ${fish.scientificName}`));
  const hasBetta = livestock.some(({ fish }) => /斗鱼|betta/i.test(`${fish.name} ${fish.scientificName}`));
  const livestockText = livestock.map(({ aqFish, fish }) => `${fish.name} x${aqFish.quantity || 1}`).join('、') || '暂无活体生物';
  const evidence = [
    ...(aquarium ? [`当前鱼缸：${aquarium.name}`, `当前水体：约 ${volumeLiters}L · ${aquarium.waterType === 'Saltwater' ? '海水' : '淡水'} · ${aquarium.targetTemperature || 25}°C`] : ['未选择鱼缸']),
    `当前活体：${livestockText}`,
    ...stepDiagnosisQuestions
      .filter(question => answers[question.id])
      .map(question => `${question.question.replace(/[？?]$/, '')}：${answerLabelMap[answers[question.id] as StepDiagnosisAnswerValue]}`),
  ];

  if (!aquarium) {
    return {
      riskLevel: 'unknown',
      riskLabel: '信息不足',
      conclusion: '请先选择一个鱼缸，再进行诊断。',
      causes: ['缺少鱼缸数据'],
      todayActions: ['先创建或选择当前鱼缸'],
      avoidActions: ['不要在没有鱼缸数据时判断鱼只状态'],
      observeItems: ['补充鱼缸容量、水温、过滤和活体记录'],
      evidence,
    };
  }

  if (livestock.length === 0 && issueType !== 'cloudy' && issueType !== 'plantProblem') {
    return {
      riskLevel: 'unknown',
      riskLabel: '信息不足',
      conclusion: '当前鱼缸暂无活体生物，无法诊断鱼只状态。你可以先添加生物，或只查看水质/设备排查建议。',
      causes: ['当前鱼缸没有真实活体记录'],
      todayActions: ['先确认鱼缸过滤、温度和水体是否稳定', '如果只是水浑或设备异常，可以继续按水质方向排查'],
      avoidActions: ['不要套用不存在生物的疾病建议', '不要在没有活体记录时判断鱼病'],
      observeItems: ['过滤是否正常出水', '水体是否浑浊或有异味', '温度是否稳定'],
      evidence,
    };
  }

  if (issueType === 'shrimpDeath' && !hasShrimp) {
    return {
      riskLevel: 'unknown',
      riskLabel: '信息不足',
      conclusion: '当前鱼缸没有虾类记录，无法生成虾类死亡诊断。',
      causes: ['当前活体中没有虾类'],
      todayActions: ['先确认是否选错鱼缸', '如果实际有虾，请先把虾类添加到当前鱼缸记录'],
      avoidActions: ['不要套用虾类蜕壳或铜药风险判断到没有虾的鱼缸'],
      observeItems: ['当前真实活体是否完整记录', '水体是否有异味或浑浊'],
      evidence,
    };
  }

  const causes: string[] = [];
  const actions: string[] = [];
  const avoid: string[] = ['不要继续新增生物', '不要盲目下药'];
  const observe: string[] = ['是否持续浮头', '是否拒食', '是否躲藏', '水体是否变浑或有异味'];
  let riskLevel: StepDiagnosisResult['riskLevel'] = 'low';
  const liftRisk = (next: StepDiagnosisResult['riskLevel']) => {
    if (riskWeight[next] > riskWeight[riskLevel]) riskLevel = next;
  };

  if (answers.gasping === 'frequent') {
    liftRisk('high');
    causes.push('疑似缺氧、水质刺激或过滤出水异常');
    actions.push('立即增加打氧或水面扰动', '检查过滤器是否正常出水', '暂停喂食 12-24 小时');
  } else if (answers.gasping === 'occasional') {
    liftRisk('medium');
    causes.push('可能存在轻微缺氧或短期应激');
    actions.push('增加水面扰动或短时打氧', '检查过滤器是否正常出水');
  }

  if (answers.cloudyWater === 'obvious') {
    liftRisk('medium');
    causes.push('可能存在水质恶化或有机物污染');
    actions.push('捞出明显残饵或腐败物', '少量换水 20%-30%');
    avoid.push('不要同时大量下药和清洗滤材');
    observe.push('是否出现异味加重或死亡个体');
  } else if (answers.cloudyWater === 'mild') {
    liftRisk('medium');
    causes.push('可能是残饵、投喂或硝化波动造成的轻微水质变化');
    actions.push('减少本次投喂量', '清理可见残饵');
  }

  if (answers.recentWaterChange === 'large') {
    liftRisk('medium');
    causes.push('可能存在大比例换水后的水温或水质刺激');
    actions.push('保持水温稳定，先观察 2-4 小时');
    avoid.push('不要马上再次大比例换水');
  } else if (answers.recentWaterChange === 'small') {
    causes.push('近期少量换水通常不是主要风险，但仍需确认温差');
  }

  if (answers.recentNewLivestock === 'yes') {
    liftRisk('medium');
    causes.push('可能存在新生物入缸应激或混养压力');
    actions.push('减少打扰，弱光观察 24 小时');
    observe.push('新加入个体是否被追咬或拒食');
  }

  if (answers.abnormalBehavior === 'obvious') {
    liftRisk('high');
    causes.push('已经出现明显拒食、躲藏或死亡，需要提高处理优先级');
    actions.push('记录异常个体，必要时隔离观察');
    observe.push('是否出现死亡个体');
  } else if (answers.abnormalBehavior === 'mild') {
    liftRisk('medium');
    causes.push('有轻微行为异常，需要继续观察是否扩大到多条生物');
  }

  if (issueType === 'aggression' || hasBetta) {
    causes.push(hasBetta ? '当前鱼缸存在斗鱼，需额外关注领地压力' : '可能存在领地或空间竞争');
    actions.push('增加水草、沉木或石缝作为躲避区');
    avoid.push('不要频繁追捞所有生物');
  }

  if (hasShrimp && ['shrimpDeath', 'cloudy'].includes(issueType)) {
    causes.push('当前鱼缸有虾类，虾对水质波动和药物更敏感');
    avoid.push('不要使用含铜药物或不明除藻剂');
    observe.push('是否出现连续死亡或蜕壳失败');
  }

  const unknownCount = Object.values(answers).filter(value => value === 'unknown').length;
  if (unknownCount >= 3) {
    liftRisk('unknown');
    causes.push('当前回答中不确定信息较多');
    actions.push('先观察 2-4 小时，并补充水质、换水和喂食信息');
  }

  const resolvedRiskLevel = riskLevel as StepDiagnosisResult['riskLevel'];
  const riskLabel = resolvedRiskLevel === 'high' ? '高风险' : resolvedRiskLevel === 'medium' ? '中风险' : resolvedRiskLevel === 'unknown' ? '信息不足' : '低风险';
  const conclusion = resolvedRiskLevel === 'high'
    ? '初步判断：存在较明显风险，优先处理供氧、过滤和水质。'
    : resolvedRiskLevel === 'medium'
      ? '初步判断：可能存在轻微缺氧、水质波动或短期应激。'
      : resolvedRiskLevel === 'unknown'
        ? '当前信息不足，建议先补充观察和水质信息。'
        : '初步判断：暂未发现明显高风险，先轻量观察。';

  return {
    riskLevel: resolvedRiskLevel,
    riskLabel,
    conclusion,
    causes: Array.from(new Set(causes.length > 0 ? causes : ['信息不足或轻微环境波动'])).slice(0, 5),
    todayActions: Array.from(new Set(actions.length > 0 ? actions : ['保持环境稳定', '观察 24 小时', '检查过滤和水温'])).slice(0, 5),
    avoidActions: Array.from(new Set(avoid)).slice(0, 5),
    observeItems: Array.from(new Set(observe)).slice(0, 5),
    evidence: Array.from(new Set(evidence)).slice(0, 8),
  };
};

export default function CareEncyclopedia() {
  const location = useLocation();
  const { navigateToSection } = useWorkspaceNavigation();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');
  const [highFrequencyFilter, setHighFrequencyFilter] = useState('全部');
  const [careWorkspacePage, setCareWorkspacePage] = useState<'home' | 'content'>('home');
  const [careResultPage, setCareResultPage] = useState(0);
  const [selectedTopic, setSelectedTopic] = useState<CareTopic | null>(null);
  const [checkedActions, setCheckedActions] = useState<string[]>([]);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCareFilterOpen, setIsCareFilterOpen] = useState(false);
  const [draftCareCategory, setDraftCareCategory] = useState(activeCategory);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [careViewMode, setCareViewMode] = useState<CareViewMode>('all');
  const [draftCareViewMode, setDraftCareViewMode] = useState<CareViewMode>('all');
  const [favorites, setFavorites] = useState<CareFavoriteMap>(() => getCareFavorites());
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
  const recommendationCarouselRef = useRef<HTMLDivElement | null>(null);
  const detailScrollRef = useRef<HTMLDivElement | null>(null);
  const favoriteShelfRef = useRef<HTMLButtonElement | null>(null);
  const careCardRef = useRef<HTMLDivElement | null>(null);
  const careSearchRef = useRef<HTMLElement | null>(null);
  const contentListRef = useRef<HTMLElement | null>(null);

  const appStateSnapshot = useMemo(() => loadAppStateFromStorage(), []);
  const activeAquarium = useMemo(() => (
    appStateSnapshot.aquariums.find(item => item.id === appStateSnapshot.currentAquariumId)
    || appStateSnapshot.aquariums[0]
    || null
  ), [appStateSnapshot]);
  const aquariumVolumeLiters = getTankVolumeLiters(activeAquarium);
  const aquariumSummary = activeAquarium
    ? `${aquariumVolumeLiters || '未设'}L · ${activeAquarium.targetTemperature || 25}°C · ${activeAquarium.waterType === 'Saltwater' ? '海水' : '淡水'} · 已有 ${(activeAquarium.fishes || []).length} 种生物`
    : '还没有当前鱼缸数据，先显示通用养护推荐';
  const careRecommendations = useMemo(() => getCareRecommendations(activeAquarium, careTopicsData), [activeAquarium]);

  useEffect(() => {
    if (!location.hash) return;
    if (location.hash === '#care-favorites') {
      setCareViewMode('favorites');
      setCareWorkspacePage('content');
      setSearchTerm('');
      setActiveCategory('全部');
      setCareResultPage(0);
      void navigateToSection('care-results', { updateHash: false });
      return;
    }
    if (location.hash === '#care-content') {
      void navigateToSection('care-results', { updateHash: false });
      return;
    }
    if (location.hash === '#care-search' || location.hash === '#care-diagnosis') {
      void navigateToSection('care-search', { updateHash: false });
      return;
    }
    if (location.hash === '#care-recommendations') {
      void navigateToSection('care-recommendations', { updateHash: false });
    }
  }, [location.hash, navigateToSection]);

  useEffect(() => {
    if (careRecommendations.length <= 1) return;
    const timer = window.setInterval(() => {
      if (Date.now() < carouselPausedUntil || isCarouselHovering || carouselDragStart) return;
      setActiveBannerIndex(prev => (prev + 1) % careRecommendations.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [careRecommendations.length, carouselDragStart, carouselPausedUntil, isCarouselHovering]);

  useEffect(() => {
    const node = recommendationCarouselRef.current;
    if (!node || careRecommendations.length === 0) return;
    const normalizedIndex = activeBannerIndex % careRecommendations.length;
    const card = node.querySelectorAll<HTMLElement>('[data-care-recommend-card]')[normalizedIndex];
    if (!card) return;
    node.scrollTo({ left: card.offsetLeft - node.offsetLeft, behavior: 'smooth' });
  }, [activeBannerIndex, careRecommendations.length]);

  const pauseCarousel = () => {
    setCarouselPausedUntil(Date.now() + 6000);
  };

  useEffect(() => subscribeToFavorites(() => {
    setFavorites(getCareFavorites());
  }), []);

  const goToBanner = (index: number) => {
    pauseCarousel();
    setActiveBannerIndex((index + careRecommendations.length) % Math.max(1, careRecommendations.length));
  };

  const handleSelectCareCategory = (filter: string) => {
    setActiveCategory(filter);
    setCareViewMode('all');
    setCareWorkspacePage('content');
    setCareResultPage(0);
    void navigateToSection('care-results', { updateHash: false });
  };

  const openCareDetail = (topicId: string) => {
    const topic = careTopicsData.find(item => item.id === topicId);
    if (!topic) return;
    setSelectedTopic(topic);
    setCheckedActions([]);
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
    const next = toggleCareFavorite({
      id: topic.id,
      title: getDisplayTitle(topic),
      favoritedAt: new Date().toISOString(),
    });
    setFavorites(next);
  };

  const filteredTopics = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return careTopicsData.filter(topic => {
      const matchesCategory = keyword ? true : matchesChip(topic, activeCategory);
      const matchesView = careViewMode === 'all' || Boolean(favorites[topic.id]);
      const homeMeta = getCareHomeMeta(topic);
      const searchable = [
        getDisplayTitle(topic),
        topic.title,
        topic.category,
        ...homeMeta.topicTags,
        homeMeta.actionLevel,
        ...topic.keywords,
      ].join(' ').toLowerCase();
      return matchesView && matchesCategory && (!keyword || searchable.includes(keyword));
    });
  }, [activeCategory, careViewMode, favorites, searchTerm]);

  const careResultPageSize = 4;
  const careResultPageCount = Math.max(1, Math.ceil(filteredTopics.length / careResultPageSize));
  const currentCareResultPage = Math.min(careResultPage, careResultPageCount - 1);
  const pagedCareTopics = filteredTopics.slice(
    currentCareResultPage * careResultPageSize,
    currentCareResultPage * careResultPageSize + careResultPageSize,
  );

  useEffect(() => {
    setCareResultPage(0);
  }, [activeCategory, careViewMode, searchTerm]);

  const highFrequencyTopics = useMemo(() => {
    const baseIds = [
      'guide_new_fish_acclimation',
      'guide_water_deteriorate',
      'guide_safe_water_change',
      'guide_fish_death_action',
      'guide_fry_care',
      'guide_pregnant_care',
    ];
    const baseTopics = baseIds
      .map(id => careTopicsData.find(topic => topic.id === id))
      .filter((topic): topic is CareTopic => Boolean(topic));
    const expanded = [...baseTopics, ...careTopicsData]
      .filter((topic, index, list) => list.findIndex(item => item.id === topic.id) === index)
      .filter(topic => matchesChip(topic, highFrequencyFilter));
    return expanded.length > 0 ? expanded : baseTopics;
  }, [highFrequencyFilter]);

  const activeHighFrequencyTopic = highFrequencyTopics[activeBannerIndex % Math.max(1, highFrequencyTopics.length)] || highFrequencyTopics[0];

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
  const careListTitle = searchTerm.trim()
    ? `搜索结果：“${searchTerm.trim()}” · 共 ${filteredTopics.length} 篇`
    : careViewMode === 'favorites'
      ? `我的收藏 · 共 ${filteredTopics.length} 篇`
      : activeCategory !== '全部'
        ? `${activeCategory} · 共 ${filteredTopics.length} 篇`
        : '养护知识';
  const careListSubtitle = searchTerm.trim()
    ? '已按标题、简介、分类和关键词筛选。'
    : careViewMode === 'favorites'
      ? '这里收纳你常用的养护文章。'
      : activeCategory !== '全部'
        ? `当前分类：${activeCategory}`
        : '按问题浏览常用养护方法。';

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
      const { default: html2canvas } = await import('html2canvas');
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
    <div className="page-frame-wide flex min-w-0 flex-col gap-3 overflow-x-hidden pb-24 md:grid md:grid-cols-[minmax(390px,460px)_minmax(0,1fr)] md:items-start md:gap-4">
      <section className="rounded-[18px] border border-white/80 bg-white p-3 shadow-sm md:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[20px] font-black leading-tight text-ink">养护百科</h1>
            <p className="mt-1 text-[12px] font-medium text-ink/55">按问题快速查找养护方法</p>
          </div>
          <button
            type="button"
            ref={favoriteShelfRef}
            onClick={() => setIsFavoritesOpen(true)}
            className="shrink-0 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-black text-emerald-700 shadow-sm"
          >
            我的收藏{favoriteCount > 0 ? ` ${favoriteCount}` : ''}
            <ChevronRight className="ml-0.5 inline h-3.5 w-3.5" />
          </button>
        </div>
      </section>

      <section className="hidden rounded-[18px] border border-white/80 bg-white p-3 shadow-sm md:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[20px] font-black leading-tight text-ink">养护百科</h1>
            <p className="mt-1 text-[12px] font-medium text-ink/55">按问题快速查找养护方法</p>
          </div>
          <button
            type="button"
            ref={favoriteShelfRef}
            onClick={() => setIsFavoritesOpen(true)}
            className="shrink-0 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-black text-emerald-700 shadow-sm"
          >
            我的收藏{favoriteCount > 0 ? ` ${favoriteCount}` : ''}
            <ChevronRight className="ml-0.5 inline h-3.5 w-3.5" />
          </button>
        </div>
      </section>

      <section id="care-recommendations" className={`scroll-mt-4 overflow-hidden rounded-[20px] border border-white/80 bg-white p-3 shadow-sm md:col-start-1 md:row-start-1 ${(!searchTerm.trim() && careWorkspacePage === 'home') ? '' : 'hidden md:block'}`}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[16px] font-black text-ink">为当前鱼缸推荐</div>
                <p className="mt-0.5 line-clamp-1 text-[11px] font-bold text-ink/45">根据鱼缸：{aquariumSummary}</p>
              </div>
              <span className="shrink-0 rounded-full bg-bg px-2.5 py-1 text-[10px] font-black text-ink/42">左右滑动查看更多</span>
            </div>
            <div
              ref={recommendationCarouselRef}
              className="app-scrollbar-hidden -mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-1 md:overflow-hidden"
              onScroll={(event) => {
                const node = event.currentTarget;
                const cardWidth = node.querySelector<HTMLElement>('[data-care-recommend-card]')?.offsetWidth || node.clientWidth;
                setActiveBannerIndex(Math.round(node.scrollLeft / Math.max(1, cardWidth + 12)));
              }}
            >
              {careRecommendations.map(({ topic, reason }, index) => (
                <article
                  key={topic.id}
                  data-care-recommend-card
                  className="grid min-w-[84%] snap-center grid-cols-[42%_1fr] gap-3 rounded-[18px] bg-emerald-50/45 p-2.5 md:min-w-full md:max-w-full md:grid-cols-[42%_1fr] md:gap-3"
                >
                  <button
                    type="button"
                    onClick={() => openCareDetail(topic.id)}
                    className="relative flex h-[148px] items-center justify-center overflow-hidden rounded-[16px] bg-white/70"
                    aria-label={`查看${getDisplayTitle(topic)}`}
                  >
                    <CareImage topic={topic} className="h-full w-full" />
                  </button>
                  <div className="min-w-0 py-1 text-left">
                    <div className="text-[10px] font-black text-emerald-700">{reason}</div>
                    <h2 className="mt-1.5 line-clamp-2 text-[17px] font-black leading-tight text-ink">{getDisplayTitle(topic)}</h2>
                    <p className="mt-1.5 line-clamp-3 text-[12px] font-medium leading-relaxed text-ink/58">{topic.summary}</p>
                    <button
                      type="button"
                      onClick={() => openCareDetail(topic.id)}
                      className="mt-2 inline-flex rounded-full bg-emerald-700 px-3 py-1.5 text-[11px] font-black text-white md:desktop-action-fit"
                    >
                      查看内容
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <div className="mt-2 flex justify-center gap-1.5">
              {careRecommendations.map((item, index) => (
                <button
                  key={item.topic.id}
                  type="button"
                  aria-label={`切换到推荐 ${index + 1}`}
                  onClick={() => goToBanner(index)}
                  className="flex h-5 w-7 items-center justify-center rounded-full"
                >
                  <span className={`h-1.5 rounded-full transition-all ${activeBannerIndex % Math.max(1, careRecommendations.length) === index ? 'w-5 bg-emerald-700' : 'w-1.5 bg-ink/18'}`} />
                </button>
              ))}
            </div>
      </section>

      <section id="care-search" ref={careSearchRef} className="scroll-mt-4 rounded-[18px] border border-white/80 bg-white p-3 shadow-sm md:col-start-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
          <Input
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setCareWorkspacePage(event.target.value.trim() ? 'content' : careWorkspacePage);
              setCareResultPage(0);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && searchTerm.trim()) {
                void navigateToSection('care-results', { updateHash: false });
              }
            }}
            placeholder="搜索：水浑、浮头、不吃食、死鱼、怀孕、过水"
            className="h-10 rounded-full border-border bg-bg pl-9 text-[13px] font-medium text-ink placeholder:text-ink/36 md:desktop-input-limit"
          />
        </div>
      </section>

      <section id="care-categories" className={`${searchTerm.trim() ? 'hidden md:block' : ''} scroll-mt-4 rounded-[18px] border border-white/80 bg-white p-3 shadow-sm md:col-start-1`}>
          <div className="mb-2 text-[15px] font-black text-ink">我现在想处理什么？</div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-2 md:gap-3">
            {careCategoryEntrances.map(item => {
              const Icon = item.icon;
              const selected = activeCategory === item.filter;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleSelectCareCategory(item.filter)}
                  className={`grid min-h-[76px] grid-cols-[28px_1fr] items-center gap-2 rounded-[16px] border px-3 py-2 text-left transition-colors ${
                    selected ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-border/70 bg-bg/70 text-ink/68 hover:border-emerald-100 hover:bg-emerald-50/45'
                  }`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12px] font-black leading-tight">{item.label}</span>
                    <span className="mt-0.5 block text-[10px] font-bold leading-tight opacity-55">{item.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
      </section>

      <section id="care-results" ref={contentListRef} className="scroll-mt-4 grid grid-cols-1 gap-3 md:col-start-2 md:row-start-1 md:row-span-5">
        <div className="rounded-[18px] border border-white/80 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[15px] font-black text-ink">
              {careListTitle}
            </div>
            <div className="mt-0.5 text-[11px] font-bold text-ink/45">{careListSubtitle}</div>
          </div>
          {(activeCategory !== '全部' || searchTerm.trim() || careViewMode === 'favorites') && (
            <button
              type="button"
              onClick={() => {
                setActiveCategory('全部');
                setCareViewMode('all');
                setSearchTerm('');
                setCareWorkspacePage('home');
              }}
              className="shrink-0 rounded-full bg-bg px-3 py-1.5 text-[11px] font-black text-emerald-700"
            >
              {searchTerm.trim() ? '清空搜索' : careViewMode === 'favorites' ? '查看全部' : '清除筛选'}
            </button>
          )}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {pagedCareTopics.map(topic => (
            <CareArticleCard
              key={topic.id}
              topic={topic}
              favorite={Boolean(favorites[topic.id])}
              onClick={() => openCareDetail(topic.id)}
              onToggleFavorite={(source) => toggleFavorite(topic, source)}
            />
          ))}
        </div>
        {filteredTopics.length > careResultPageSize && (
          <div className="flex items-center justify-center gap-2 rounded-[18px] bg-white/80 px-3 py-3 shadow-sm">
            <button
              type="button"
              disabled={currentCareResultPage === 0}
              onClick={() => setCareResultPage(page => Math.max(0, page - 1))}
              className="h-9 rounded-full border border-border bg-white px-4 text-[12px] font-black text-ink/65 disabled:opacity-35"
            >
              上一页
            </button>
            <span className="rounded-full bg-emerald-50 px-3 py-2 text-[12px] font-black text-emerald-800">
              第 {currentCareResultPage + 1} / {careResultPageCount} 页
            </span>
            <button
              type="button"
              disabled={currentCareResultPage >= careResultPageCount - 1}
              onClick={() => setCareResultPage(page => Math.min(careResultPageCount - 1, page + 1))}
              className="h-9 rounded-full border border-border bg-white px-4 text-[12px] font-black text-ink/65 disabled:opacity-35"
            >
              下一页
            </button>
          </div>
        )}
      </section>

      {filteredTopics.length === 0 && (
        <div className="rounded-[18px] border border-dashed border-border bg-white p-8 text-center text-sm font-bold text-ink/50 md:col-start-2">
          {careViewMode === 'favorites'
            ? '还没有收藏的养护问题。看到常用问题时，点文章右上角爱心就会加入这里。'
            : '没有找到相关内容，可以试试：水浑、浮头、过水、换水、死鱼。'}
        </div>
      )}

      <Dialog open={!!selectedTopic} onOpenChange={(open) => !open && setSelectedTopic(null)}>
        <DialogContent className="modalCardWide w-[92vw] max-w-[560px] overflow-hidden rounded-[24px] border-border p-0 md:max-w-[900px]">
          {selectedTopic && (
            <CareArticleDetail
              key={selectedTopic.id}
              topic={selectedTopic}
              scrollRef={detailScrollRef}
              checkedActions={checkedActions}
              favorite={Boolean(favorites[selectedTopic.id])}
              onToggleAction={(value) => toggleValue(value, setCheckedActions)}
              onToggleFavorite={(source) => toggleFavorite(selectedTopic, source)}
              onOpenShare={() => {
                setShareTopic(selectedTopic);
                setShareMessage('');
                setCopyMessage('');
              }}
              onPreview={() => openPreview(selectedTopic)}
              onSelectRelated={(topic) => openCareDetail(topic.id)}
              activeAquarium={activeAquarium}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isFavoritesOpen} onOpenChange={setIsFavoritesOpen}>
        <DialogContent className="flex max-h-[82dvh] w-[92vw] max-w-[430px] md:max-w-[600px] flex-col overflow-hidden rounded-[24px] border-border bg-bg p-0">
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

      {isPreviewOpen && (
        <Suspense fallback={null}>
          <ImagePreviewModal
            images={previewImages}
            index={previewIndex}
            open
            onClose={() => setIsPreviewOpen(false)}
            onIndexChange={setPreviewIndex}
          />
        </Suspense>
      )}

      {isCareFilterOpen && (
        <Suspense fallback={null}>
          <FilterBottomSheet
        open
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
        </Suspense>
      )}

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
              <div className="modalFooter sticky bottom-0 grid shrink-0 grid-cols-2 gap-2 border-t border-[#EEF2E8] bg-white">
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
      <button type="button" onClick={onClick} className="grid min-h-[132px] w-full grid-cols-[112px_1fr] gap-3 text-left transition-transform active:scale-[0.99] max-[360px]:grid-cols-1">
        <span data-care-card-image>
          <CareImage topic={topic} className="h-[112px] w-[112px] rounded-[16px] max-[360px]:h-[180px] max-[360px]:w-full" />
        </span>
        <span className="min-w-0 pr-8 max-[360px]:pr-0">
          <span className="line-clamp-2 block text-[15px] font-black leading-snug text-ink">{getDisplayTitle(topic)}</span>
          <span className="mt-1.5 line-clamp-2 block text-[12px] font-medium leading-relaxed text-ink/56">{topic.summary}</span>
          <span className="mt-2 inline-flex rounded-full bg-emerald-700 px-3 py-1.5 text-[11px] font-black text-white md:desktop-action-fit">
            查看内容
          </span>
        </span>
      </button>
    </article>
  );
}

function StepDiagnosisPanel({ topic }: { topic: CareTopic }) {
  const appState = useMemo(() => loadAppStateFromStorage(), []);
  const aquariums = appState.aquariums;
  const defaultAquariumId = appState.currentAquariumId || aquariums[0]?.id || '';
  const [diagnosisState, setDiagnosisState] = useState<StepDiagnosisState>(() => ({
    issueType: inferStepDiagnosisIssue(topic),
    currentStep: 1,
    questionIndex: 0,
    answers: {},
    targetAquariumId: defaultAquariumId,
    result: null,
  }));

  useEffect(() => {
    setDiagnosisState({
      issueType: inferStepDiagnosisIssue(topic),
      currentStep: 1,
      questionIndex: 0,
      answers: {},
      targetAquariumId: defaultAquariumId,
      result: null,
    });
  }, [defaultAquariumId, topic.id]);

  const targetAquarium = aquariums.find(item => item.id === diagnosisState.targetAquariumId) || aquariums[0] || null;
  const currentLivestock = useMemo(() => getCurrentLivestock(targetAquarium), [targetAquarium]);
  const volumeLiters = getTankVolumeLiters(targetAquarium);
  const diagnosisQuestions = useMemo(() => getStepDiagnosisQuestions(diagnosisState.issueType), [diagnosisState.issueType]);
  const activeQuestionIndex = Math.min(Math.max(diagnosisState.questionIndex, 0), diagnosisQuestions.length - 1);
  const activeQuestion = diagnosisQuestions[activeQuestionIndex];
  const answeredCount = diagnosisQuestions.filter(question => diagnosisState.answers[question.id]).length;
  const isQuestionStep = diagnosisState.currentStep === 2;
  const isSummaryStep = diagnosisState.currentStep === 3;
  const isResultStep = diagnosisState.currentStep === 4 && diagnosisState.result;
  const progressLabel = isQuestionStep
    ? `第 ${activeQuestionIndex + 1} 题 / 共 ${diagnosisQuestions.length} 题`
    : `第 ${diagnosisState.currentStep} 步 / 共 4 步`;
  const progressPercent = diagnosisState.currentStep === 1
    ? 25
    : diagnosisState.currentStep === 2
      ? 25 + (answeredCount / diagnosisQuestions.length) * 45
      : diagnosisState.currentStep === 3
        ? 80
        : 100;
  const issueMeta = stepDiagnosisIssues.find(item => item.id === diagnosisState.issueType) || stepDiagnosisIssues[0];

  const updateAnswer = (key: keyof StepDiagnosisAnswers, value: StepDiagnosisAnswerValue) => {
    setDiagnosisState(prev => ({
      ...prev,
      answers: { ...prev.answers, [key]: value },
      result: null,
    }));
  };

  const goNext = () => {
    setDiagnosisState(prev => {
      if (prev.currentStep === 1) return { ...prev, currentStep: 2, questionIndex: 0, result: null };
      if (prev.currentStep === 2) {
        const nextQuestionIndex = activeQuestionIndex + 1;
        if (nextQuestionIndex < diagnosisQuestions.length) return { ...prev, questionIndex: nextQuestionIndex, result: null };
        return { ...prev, currentStep: 3, result: null };
      }
      if (prev.currentStep === 3) {
        const result = buildStepDiagnosisResult({
          aquarium: targetAquarium,
          livestock: currentLivestock,
          answers: prev.answers,
          issueType: prev.issueType,
        });
        return { ...prev, currentStep: 4, result };
      }
      return prev;
    });
  };

  const goPrevious = () => {
    setDiagnosisState(prev => {
      if (prev.currentStep <= 1) return prev;
      if (prev.currentStep === 4) return { ...prev, currentStep: 3, result: null };
      if (prev.currentStep === 3) return { ...prev, currentStep: 2, result: null };
      if (prev.currentStep === 2 && prev.questionIndex > 0) return { ...prev, questionIndex: prev.questionIndex - 1, result: null };
      return { ...prev, currentStep: 1, result: null };
    });
  };

  const moveQuestion = (direction: 1 | -1) => {
    const nextIndex = activeQuestionIndex + direction;
    if (nextIndex < 0) {
      setDiagnosisState(prev => ({ ...prev, currentStep: 1, questionIndex: 0, result: null }));
      return;
    }
    if (nextIndex >= diagnosisQuestions.length) {
      setDiagnosisState(prev => ({ ...prev, currentStep: 3, result: null }));
      return;
    }
    setDiagnosisState(prev => ({
      ...prev,
      currentStep: 2,
      questionIndex: nextIndex,
      result: null,
    }));
  };

  const canGoNext = diagnosisState.currentStep === 1
    || diagnosisState.currentStep === 3
    || (isQuestionStep && Boolean(diagnosisState.answers[activeQuestion.id]));
  const bottomButtonText = diagnosisState.currentStep === 3
    ? '生成诊断'
    : isResultStep
      ? '查看处理建议'
      : '下一步';

  return (
    <section className="mt-4 rounded-[22px] border border-emerald-100 bg-[#F8FCF8] p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[16px] font-black text-ink">分步诊断</div>
          <div className="mt-0.5 text-[11px] font-bold text-ink/45">{progressLabel}</div>
        </div>
        {diagnosisState.currentStep > 1 && (
          <button
            type="button"
            onClick={isQuestionStep ? () => moveQuestion(-1) : goPrevious}
            className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-emerald-700 shadow-sm"
          >
            返回
          </button>
        )}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-emerald-700 transition-all" style={{ width: `${progressPercent}%` }} />
      </div>

      {diagnosisState.currentStep === 1 && (
        <div className="mt-3 grid gap-2">
          {stepDiagnosisIssues.map(issue => {
            const selected = diagnosisState.issueType === issue.id;
            return (
              <button
                key={issue.id}
                type="button"
                onClick={() => setDiagnosisState(prev => ({ ...prev, issueType: issue.id, questionIndex: 0, answers: {}, result: null }))}
                className={`rounded-[16px] border px-3 py-3 text-left transition-colors ${
                  selected ? 'border-emerald-300 bg-white text-emerald-900 shadow-sm' : 'border-transparent bg-white/65 text-ink/68'
                }`}
              >
                <div className="text-[13px] font-black">{issue.label}</div>
                <div className="mt-0.5 text-[11px] font-medium leading-relaxed opacity-70">{issue.description}</div>
              </button>
            );
          })}
        </div>
      )}

      {isQuestionStep && activeQuestion && (
        <div className="mt-3 rounded-[18px] bg-white p-3 shadow-sm">
          <div className="text-[11px] font-black text-emerald-700">{issueMeta.label}</div>
          <div className="mt-1 text-[16px] font-black leading-relaxed text-ink">{activeQuestion.question}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {activeQuestion.options.map(option => {
              const selected = diagnosisState.answers[activeQuestion.id] === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateAnswer(activeQuestion.id, option.value)}
                  className={`rounded-full border px-3 py-2 text-[12px] font-black transition-colors ${
                    selected ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-border bg-bg text-ink/55'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <div className="mt-3 rounded-[14px] bg-emerald-50 px-3 py-2 text-[11px] font-bold leading-relaxed text-emerald-900/70">
            诊断结果将在完成后生成，请继续回答剩余问题。
          </div>
        </div>
      )}

      {(isSummaryStep || isResultStep) && (
        <div className="mt-3 rounded-[18px] bg-white p-3 shadow-sm">
          <div className="mb-2 text-[13px] font-black text-ink">当前鱼缸摘要</div>
          {aquariums.length > 1 && !isResultStep && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {aquariums.map(aquarium => (
                <button
                  key={aquarium.id}
                  type="button"
                  onClick={() => setDiagnosisState(prev => ({ ...prev, targetAquariumId: aquarium.id, result: null }))}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black ${
                    diagnosisState.targetAquariumId === aquarium.id ? 'bg-emerald-700 text-white' : 'bg-bg text-ink/55'
                  }`}
                >
                  {aquarium.name}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 md:desktop-card-grid md:gap-3">
            {[
              { label: '鱼缸', value: targetAquarium?.name || '未选择' },
              { label: '容量', value: targetAquarium ? `${volumeLiters}L` : '未设置' },
              { label: '水温', value: targetAquarium ? `${targetAquarium.targetTemperature || 25}°C` : '未设置' },
              { label: '水质', value: targetAquarium?.waterType === 'Saltwater' ? '海水' : '淡水' },
              { label: '过滤', value: targetAquarium?.equipment?.filter || '未设置' },
              { label: '最近换水', value: targetAquarium?.lastWaterChangeDate ? new Date(targetAquarium.lastWaterChangeDate).toLocaleDateString('zh-CN') : '暂无记录' },
            ].map(item => (
              <div key={item.label} className="rounded-[13px] bg-bg px-3 py-2">
                <div className="text-[10px] font-black text-ink/38">{item.label}</div>
                <div className="mt-0.5 truncate text-[12px] font-black text-ink">{item.value}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 rounded-[13px] bg-emerald-50 px-3 py-2 text-[11px] font-bold leading-relaxed text-emerald-900">
            当前活体：{currentLivestock.length > 0 ? currentLivestock.map(({ aqFish, fish }) => `${fish.name} x${aqFish.quantity || 1}`).join('、') : '暂无活体生物'}
          </div>
          {!isResultStep && (
            <div className="mt-2 rounded-[13px] bg-blue-50 px-3 py-2 text-[11px] font-bold leading-relaxed text-blue-800">
              确认鱼缸信息后点击“生成诊断”，才会展示今日建议和暂时避免。
            </div>
          )}
        </div>
      )}

      {isResultStep && diagnosisState.result && (
        <div className="mt-3 grid gap-3">
          <div className={`rounded-[18px] px-3 py-3 ${
            diagnosisState.result.riskLevel === 'high' ? 'bg-red-50' :
            diagnosisState.result.riskLevel === 'medium' ? 'bg-amber-50' :
            diagnosisState.result.riskLevel === 'unknown' ? 'bg-blue-50' :
            'bg-emerald-50'
          }`}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-[12px] font-black text-ink/45">诊断结论</div>
              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-ink/60">{diagnosisState.result.riskLabel}</span>
            </div>
            <div className="mt-1 text-[14px] font-black leading-relaxed text-ink">{diagnosisState.result.conclusion}</div>
          </div>
          {[
            { title: '判断依据', items: diagnosisState.result.evidence },
            { title: '可能原因', items: diagnosisState.result.causes },
            { title: '今日建议', items: diagnosisState.result.todayActions },
            { title: '暂时避免', items: diagnosisState.result.avoidActions },
            { title: '继续观察', items: diagnosisState.result.observeItems },
          ].map(section => (
            <div key={section.title} className="rounded-[18px] bg-white p-3 shadow-sm">
              <div className="text-[13px] font-black text-ink">{section.title}</div>
              <div className="mt-2 grid gap-1.5">
                {section.items.map(item => (
                  <div key={item} className="rounded-[12px] bg-bg px-3 py-2 text-[11px] font-medium leading-relaxed text-ink/68">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        {isQuestionStep && activeQuestionIndex > 0 && (
          <Button type="button" variant="outline" onClick={() => moveQuestion(-1)} className="h-10 rounded-full text-sm font-black">
            上一题
          </Button>
        )}
        {isQuestionStep && activeQuestionIndex < diagnosisQuestions.length - 1 ? (
          <Button
            type="button"
            onClick={() => moveQuestion(1)}
            disabled={!diagnosisState.answers[activeQuestion.id]}
            className="h-10 flex-1 rounded-full bg-emerald-700 text-sm font-black text-white hover:bg-emerald-800 disabled:bg-ink/15 disabled:text-ink/35"
          >
            下一题
          </Button>
        ) : !isResultStep ? (
          <Button
            type="button"
            onClick={goNext}
            disabled={!canGoNext}
            className="h-10 flex-1 rounded-full bg-emerald-700 text-sm font-black text-white hover:bg-emerald-800 disabled:bg-ink/15 disabled:text-ink/35"
          >
            {bottomButtonText}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => setDiagnosisState(prev => ({ ...prev, currentStep: 1, questionIndex: 0, answers: {}, result: null }))}
            className="h-10 flex-1 rounded-full bg-emerald-700 text-sm font-black text-white hover:bg-emerald-800"
          >
            重新诊断
          </Button>
        )}
      </div>
    </section>
  );
}

function CareArticleDetail({
  topic,
  scrollRef,
  checkedActions,
  favorite,
  onToggleAction,
  onToggleFavorite,
  onOpenShare,
  onPreview,
  onSelectRelated,
  activeAquarium,
}: {
  topic: CareTopic;
  scrollRef: RefObject<HTMLDivElement | null>;
  checkedActions: string[];
  favorite: boolean;
  onToggleAction: (value: string) => void;
  onToggleFavorite: (source: HTMLElement) => void;
  onOpenShare: () => void;
  onPreview: () => void;
  onSelectRelated: (topic: CareTopic) => void;
  activeAquarium: Aquarium | null;
}) {
  const meta = getCareGuideMeta(topic);
  const careGuide = buildCareGuide(topic);
  const visibleActions = careGuide.todayActions;
  const completedVisibleActions = checkedActions.filter(item => visibleActions.some(action => action.description === item)).length;
  const relatedTopics = getRelatedCareGuides(topic, careTopicsData, activeAquarium);
  const [ctaFeedback, setCtaFeedback] = useState('');
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);
  const [isDiagnosisStarted, setIsDiagnosisStarted] = useState(false);
  const [isChecklistSaved, setIsChecklistSaved] = useState(false);
  const [isOperationCompleted, setIsOperationCompleted] = useState(false);
  const [reminderSheet, setReminderSheet] = useState<null | {
    title: string;
    options: string[];
    storageType: string;
    successMessage: string;
  }>(null);
  const [selectedReminderOption, setSelectedReminderOption] = useState('');
  const procedureSteps = meta.guideType === 'procedure' ? getProcedureSteps(topic) : [];
  const procedureReminders = meta.guideType === 'procedure' ? getProcedureReminders(topic) : [];
  const procedureDetails = meta.guideType === 'procedure' ? getProcedureDetails(topic) : careGuide.maintenanceTips;
  const isWaterChangeGuide = /换水/.test(`${getDisplayTitle(topic)} ${topic.title} ${topic.keywords.join(' ')}`);
  const isFilterGuide = /过滤|滤材|清洗/.test(`${getDisplayTitle(topic)} ${topic.title} ${topic.keywords.join(' ')}`);
  const isFryGuide = /鱼苗|开口|卵黄囊/.test(`${getDisplayTitle(topic)} ${topic.title} ${topic.keywords.join(' ')}`);

  useEffect(() => {
    setIsDiagnosisStarted(false);
    setIsDetailExpanded(false);
    setCtaFeedback('');
  }, [topic.id]);
  const primaryCtaLabel = meta.guideType === 'procedure'
    ? isNewFishAcclimationTopic(topic)
      ? '设置 3 天观察提醒'
      : isWaterChangeGuide
        ? isOperationCompleted ? '已记录本次换水' : '标记已完成换水'
        : isOperationCompleted ? '已标记完成' : isFilterGuide ? '标记已完成清洗' : '标记已完成操作'
    : meta.guideType === 'careChecklist'
      ? isChecklistSaved ? '已保存护理清单' : '保存护理清单'
      : meta.guideType === 'diagnosis'
        ? '开始问题自查'
        : meta.guideType === 'knowledge'
          ? favorite ? '已收藏这篇指南' : '收藏这篇指南'
          : '设置提醒';
  const secondaryLabel: string | null = meta.guideType === 'procedure'
    ? isNewFishAcclimationTopic(topic)
      ? isOperationCompleted ? '已完成过水' : '标记已完成过水'
      : isWaterChangeGuide
        ? '设置下次换水提醒'
        : null
    : meta.guideType === 'careChecklist'
      ? isFryGuide ? '设置开口喂食提醒' : '设置阶段护理提醒'
      : null;

  const addReminder = (label?: string, storageType: string = meta.guideType, successMessage?: string) => {
    const reminders = safeJsonParse<Array<{ id: string; title: string; type: string; createdAt: string; label?: string }>>(
      localStorage.getItem('aqua_care_reminders'),
      [],
    );
    const next = [
      { id: topic.id, title: getDisplayTitle(topic), type: storageType, createdAt: new Date().toISOString(), label },
      ...reminders.filter(item => item.id !== topic.id),
    ].slice(0, 30);
    localStorage.setItem('aqua_care_reminders', JSON.stringify(next));
    setCtaFeedback(successMessage || '提醒已设置');
    window.setTimeout(() => setCtaFeedback(''), 1800);
  };

  const openReminderSheet = (kind: 'newFish' | 'waterChange' | 'stage' | 'fry' | 'general') => {
    const config = {
      newFish: {
        title: '设置新鱼观察提醒',
        options: ['24 小时后检查状态', '3 天后确认是否稳定', '7 天后结束隔离观察'],
        storageType: 'new_fish_observation',
        successMessage: '新鱼观察提醒已设置',
      },
      waterChange: {
        title: '设置下次换水提醒',
        options: ['3 天后提醒复查水质', '7 天后提醒小换水', '14 天后提醒例行换水'],
        storageType: 'water_change',
        successMessage: '下次换水提醒已设置',
      },
      stage: {
        title: '设置阶段护理提醒',
        options: ['明天提醒复查状态', '3 天后提醒观察变化', '7 天后提醒进入下一阶段'],
        storageType: 'stage_care',
        successMessage: '阶段护理提醒已设置',
      },
      fry: {
        title: '设置开口喂食提醒',
        options: ['12 小时后观察卵黄囊', '24 小时后少量试喂', '3 天后复查鱼苗状态'],
        storageType: 'fry_feeding',
        successMessage: '开口喂食提醒已设置',
      },
      general: {
        title: '设置养护提醒',
        options: ['明天提醒复查', '3 天后提醒观察', '7 天后提醒复盘'],
        storageType: 'care',
        successMessage: '养护提醒已设置',
      },
    }[kind];
    setReminderSheet(config);
    setSelectedReminderOption(config.options[0]);
  };

  const confirmReminder = () => {
    if (!reminderSheet) return;
    addReminder(selectedReminderOption, reminderSheet.storageType, reminderSheet.successMessage);
    setReminderSheet(null);
  };

  const markOperationCompleted = (label: string) => {
    const completed = safeJsonParse<Array<{ id: string; title: string; label: string; aquariumId?: string; completedAt: string }>>(
      localStorage.getItem('aqua_care_completed_operations'),
      [],
    );
    const next = [
      { id: topic.id, title: getDisplayTitle(topic), label, aquariumId: activeAquarium?.id, completedAt: new Date().toISOString() },
      ...completed.filter(item => item.id !== topic.id),
    ].slice(0, 50);
    localStorage.setItem('aqua_care_completed_operations', JSON.stringify(next));
    setIsOperationCompleted(true);
    setCtaFeedback(label.includes('换水') ? '已记录本次换水' : '已标记完成');
    window.setTimeout(() => setCtaFeedback(''), 1800);
  };

  const saveChecklist = () => {
    const saved = safeJsonParse<Array<{ id: string; title: string; savedAt: string; actions: string[] }>>(
      localStorage.getItem('aqua_care_saved_checklists'),
      [],
    );
    const next = [
      {
        id: topic.id,
        title: getDisplayTitle(topic),
        savedAt: new Date().toISOString(),
        actions: visibleActions.map(action => `${action.title}：${action.description}`),
      },
      ...saved.filter(item => item.id !== topic.id),
    ].slice(0, 30);
    localStorage.setItem('aqua_care_saved_checklists', JSON.stringify(next));
    setIsChecklistSaved(true);
    setCtaFeedback('护理清单已保存');
    window.setTimeout(() => setCtaFeedback(''), 1800);
  };

  const handleSecondaryCta = () => {
    if (meta.guideType === 'procedure') {
      if (isNewFishAcclimationTopic(topic)) {
        markOperationCompleted('已完成过水');
        return;
      }
      if (isWaterChangeGuide) {
        openReminderSheet('waterChange');
        return;
      }
      setIsDetailExpanded(prev => !prev);
      return;
    }
    if (meta.guideType === 'careChecklist') {
      openReminderSheet(isFryGuide ? 'fry' : 'stage');
      return;
    }
    if (meta.guideType === 'knowledge' && relatedTopics.length > 0) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      setCtaFeedback('相关内容在下方');
      window.setTimeout(() => setCtaFeedback(''), 1800);
      return;
    }
    setIsDetailExpanded(prev => !prev);
  };

  const handlePrimaryCta = (source: HTMLElement) => {
    if (meta.guideType === 'procedure') {
      if (isNewFishAcclimationTopic(topic)) {
        openReminderSheet('newFish');
        return;
      }
      markOperationCompleted(isWaterChangeGuide ? '已完成换水' : isFilterGuide ? '已完成清洗' : '已完成操作');
      return;
    }
    if (meta.guideType === 'careChecklist') {
      saveChecklist();
      return;
    }
    if (meta.guideType === 'diagnosis') {
      setIsDiagnosisStarted(true);
      window.requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: 300, behavior: 'smooth' });
      });
      return;
    }
    if (meta.guideType === 'knowledge') {
      if (!favorite) onToggleFavorite(source);
      setCtaFeedback(favorite ? '这篇指南已收藏' : '已收藏，可在我的收藏中查看');
      window.setTimeout(() => setCtaFeedback(''), 1800);
      return;
    }
    openReminderSheet('general');
  };

  return (
    <div className="flex max-h-[88vh] flex-col bg-white">
      <div ref={scrollRef} className="app-scrollbar-hidden min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto max-w-[680px] p-4 pb-32 pt-8 md:max-w-[700px]">
          <button type="button" onClick={onPreview} data-care-detail-hero className="block w-full" aria-label={`查看${topic.title}大图`}>
            <CareImage topic={topic} className="h-[260px] w-full rounded-[20px]" showPreviewHint />
          </button>

          <div className="mt-4">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              {meta.topicTags.map(tag => (
                <span key={tag} className="rounded-full bg-bg px-2 py-1 text-[10px] font-black text-ink/50">{tag}</span>
              ))}
              <span className={`rounded-full px-2 py-1 text-[10px] font-black ${urgencyTagClassMap[meta.urgencyTag]}`}>
                {meta.urgencyTag}
              </span>
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

          {meta.guideType === 'diagnosis' ? (
            isDiagnosisStarted ? (
              <StepDiagnosisPanel topic={topic} />
            ) : (
              <section className="mt-4 rounded-[20px] border border-emerald-100 bg-[#F8FCF8] p-4">
                <div className="text-[15px] font-black text-ink">准备开始问题自查</div>
                <p className="mt-1 text-[12px] font-medium leading-relaxed text-ink/55">
                  系统会根据“{getDisplayTitle(topic)}”追问 2–4 个相关问题，再给出处理建议。
                </p>
              </section>
            )
          ) : meta.guideType === 'procedure' ? (
            <section className="mt-4 rounded-[22px] border border-emerald-100 bg-[#F8FCF8] p-3 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[16px] font-black text-ink">核心步骤</div>
                  <div className="mt-0.5 text-[11px] font-bold text-ink/45">先按顺序做，保持温度和水质平稳。</div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${urgencyTagClassMap[meta.urgencyTag]}`}>
                  {meta.urgencyTag}
                </span>
              </div>

              <div className="mt-3 grid gap-0">
                {procedureSteps.map((item, index) => (
                  <div key={`${item.title}-${item.description}`} className="grid grid-cols-[34px_1fr] gap-2">
                    <div className="relative flex justify-center">
                      <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-[12px] font-black text-white shadow-sm">
                        {index + 1}
                      </span>
                      {index < procedureSteps.length - 1 && <span className="absolute top-7 h-full w-px bg-emerald-100" />}
                    </div>
                    <div className={`pb-4 ${index === procedureSteps.length - 1 ? 'pb-0' : ''}`}>
                      <div className="rounded-[16px] bg-white px-3 py-3 shadow-sm">
                        <div className="text-[14px] font-black text-ink">{item.title}</div>
                        <p className="mt-1 text-[12px] font-medium leading-relaxed text-ink/62">{item.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {procedureReminders.length > 0 && (
                <div className="mt-3 rounded-[16px] bg-yellow-50 px-3 py-3">
                  <div className="text-[12px] font-black text-yellow-800">操作提醒</div>
                  <div className="mt-2 grid gap-2">
                    {procedureReminders.slice(0, 3).map(item => (
                      <div key={item.title} className="rounded-[13px] bg-white/72 px-3 py-2">
                        <div className="text-[12px] font-black text-yellow-950">{item.title}</div>
                        <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-yellow-900/72">{item.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3 rounded-[16px] border border-sky-100 bg-sky-50/65 px-3 py-3">
                <div className="text-[12px] font-black text-sky-800">入缸后观察</div>
                <p className="mt-1 text-[12px] font-medium leading-relaxed text-ink/62">{getProcedureObservation(topic)}</p>
              </div>
            </section>
          ) : (
            <section className="mt-4 rounded-[22px] border border-emerald-100 bg-[#F8FCF8] p-3 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[16px] font-black text-ink">
                    {meta.guideType === 'careChecklist' ? '护理清单' : '完整说明'}
                  </div>
                  <div className="mt-0.5 text-[11px] font-bold text-ink/45">
                    {meta.guideType === 'careChecklist'
                        ? '按阶段照料，重点是稳定、观察和少量操作。'
                        : '先理解原理，再决定是否需要操作。'}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${urgencyTagClassMap[meta.urgencyTag]}`}>
                  {meta.urgencyTag}
                </span>
              </div>

              <div className="mt-3 grid gap-2">
                {visibleActions.length > 0 ? visibleActions.map((item, index) => (
                  <ActionStepCard
                    key={`${item.title}-${item.description}`}
                    checked={checkedActions.includes(item.description)}
                    title={`${index + 1}. ${item.title}`}
                    description={item.description}
                    onClick={() => onToggleAction(item.description)}
                  />
                )) : careGuide.maintenanceTips.slice(0, 4).map((item, index) => (
                  <div key={`${item.title}-${item.description}`} className="rounded-[15px] bg-white px-3 py-3 shadow-sm">
                    <div className="text-[12px] font-black text-ink">{index + 1}. {item.title}</div>
                    <p className="mt-1 text-[11px] font-medium leading-relaxed text-ink/62">{item.description}</p>
                  </div>
                ))}
              </div>

              {careGuide.avoidActions.length > 0 && meta.guideType !== 'knowledge' && (
                <div className="mt-3 rounded-[16px] bg-yellow-50 px-3 py-3">
                  <div className="text-[12px] font-black text-yellow-800">操作提醒</div>
                  <div className="mt-2 grid gap-1.5">
                    {careGuide.avoidActions.slice(0, 3).map(item => (
                      <div key={item.title} className="text-[11px] font-medium leading-relaxed text-yellow-900/78">
                        <span className="font-black">{item.title}：</span>{item.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          <section className="mt-3 rounded-[18px] border border-border bg-white p-3">
            <button
              type="button"
              onClick={() => setIsDetailExpanded(prev => !prev)}
              className="flex w-full items-center justify-between gap-3 text-left"
              aria-expanded={isDetailExpanded}
            >
              <span className="text-[13px] font-black text-ink">详细说明与判断依据</span>
              <span className="rounded-full bg-bg px-2.5 py-1 text-[10px] font-black text-ink/50">
                {isDetailExpanded ? '收起' : '展开'}
              </span>
            </button>
            {isDetailExpanded && (
              <div className="mt-3 grid gap-2">
                {procedureDetails.map(item => (
                  <div key={`${item.title}-${item.description}`} className="rounded-[14px] bg-bg px-3 py-2.5">
                    <div className="text-[12px] font-black text-ink/76">{item.title}</div>
                    <p className="mt-1 text-[11px] font-medium leading-relaxed text-ink/60">{item.description}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {relatedTopics.length > 0 && (
            <section className="mt-3 rounded-[18px] border border-border bg-white p-3">
              <div className="mb-2 text-[12px] font-black text-ink">{meta.guideType === 'procedure' || meta.guideType === 'diagnosis' ? '下一步可以看' : '你可能还需要'}</div>
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

      <div className="modalFooter shrink-0 border-t border-border bg-white/95 shadow-[0_-12px_30px_rgba(15,23,42,0.08)]">
        <div className="grid gap-2 md:mx-auto md:max-w-[700px] md:grid-cols-[auto_auto] md:justify-end">
          <Button
            type="button"
            onClick={(event) => handlePrimaryCta(event.currentTarget)}
            className="h-11 w-full rounded-full bg-emerald-700 text-sm font-black text-white hover:bg-emerald-800 md:w-fit md:min-w-[180px] md:max-w-[240px]"
          >
            {primaryCtaLabel}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
          {secondaryLabel && (
            <Button
              type="button"
              variant="outline"
              onClick={handleSecondaryCta}
              className="h-10 w-full rounded-full border-emerald-100 bg-white text-sm font-black text-emerald-700 hover:bg-emerald-50 md:w-fit md:min-w-[160px] md:max-w-[220px]"
            >
              {secondaryLabel}
            </Button>
          )}
          {ctaFeedback && (
            <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-center text-[11px] font-black text-emerald-700 md:col-span-2">
              {ctaFeedback}
            </div>
          )}
        </div>
      </div>

      {reminderSheet && (
        <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/30 px-4 pb-4" onClick={() => setReminderSheet(null)}>
          <div className="w-full max-w-[430px] md:max-w-[600px] rounded-[24px] bg-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[17px] font-black text-ink">{reminderSheet.title}</div>
                <div className="mt-1 text-[11px] font-bold text-ink/45">选择一个提醒节点，确认后会保存到本地养护提醒。</div>
              </div>
              <button type="button" onClick={() => setReminderSheet(null)} className="rounded-full bg-bg px-2 py-1 text-[11px] font-black text-ink/45">关闭</button>
            </div>
            <div className="mt-3 grid gap-2">
              {reminderSheet.options.map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSelectedReminderOption(option)}
                  className={`rounded-[16px] border px-3 py-3 text-left text-[13px] font-black transition-colors ${
                    selectedReminderOption === option ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-border bg-bg text-ink/68'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <Button type="button" onClick={confirmReminder} className="mt-4 h-11 w-full rounded-full bg-emerald-700 text-sm font-black text-white hover:bg-emerald-800">
              确认设置
            </Button>
          </div>
        </div>
      )}
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
