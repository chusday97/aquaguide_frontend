import type { CareTopic } from '../../data/careTopicsData';
import type {
  AiDiagnosisInput,
  BuildDiagnosisInput,
  DiagnosisOutput,
  DiagnosisProblemType,
  DiagnosisRiskCode,
  DiagnosisRuleResult,
} from './diagnosis.types';

const includesAny = (values: string[], keywords: string[]) => (
  values.some(value => keywords.some(keyword => value.includes(keyword)))
);

const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

const riskPriority: Record<DiagnosisRiskCode, number> = {
  low: 1,
  unknown: 2,
  medium: 3,
  high: 4,
};

const riskLabelMap: Record<DiagnosisRiskCode, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  unknown: '信息不足',
};

const addDaysIso = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

export const matchCareArticles = (problemType: DiagnosisProblemType, answers: Record<string, string>, careTopics: CareTopic[]) => {
  const answerText = Object.values(answers).join(' ');
  const query = `${problemType} ${answerText}`;
  const scored = careTopics.map(topic => {
    const searchable = [
      topic.title,
      topic.category,
      topic.summary,
      ...topic.keywords,
      ...topic.symptoms,
      ...topic.firstSteps,
      ...topic.avoid,
    ].join(' ');
    let score = 0;
    if (topic.category.includes(problemType) || problemType.includes(topic.category)) score += 3;
    if (/水质/.test(problemType) && /水质|水浑|发白|发绿|异味|油膜/.test(searchable)) score += 3;
    if (/鱼只异常/.test(problemType) && /浮头|趴缸|白点|烂尾|拒食|鱼只异常|生病/.test(searchable)) score += 3;
    if (/新鱼入缸/.test(problemType) && /新鱼|入缸|过水|检疫/.test(searchable)) score += 3;
    if (/喂食/.test(problemType) && /喂|饲料|残饵|吃/.test(searchable)) score += 3;
    if (/怀孕|鱼苗/.test(problemType) && /怀孕|鱼苗|繁殖|母鱼/.test(searchable)) score += 3;
    if (/死亡/.test(problemType) && /死亡|死鱼|连续死/.test(searchable)) score += 3;
    query.split(/\s+/).filter(Boolean).forEach(word => {
      if (searchable.includes(word)) score += 1;
    });
    return { topic, score };
  });

  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(item => item.topic);
};

export const evaluateDiagnosisRules = (input: BuildDiagnosisInput): DiagnosisRuleResult[] => {
  const answers = Object.values(input.answers);
  const matchedArticles = matchCareArticles(input.problemType, input.answers, input.careTopics);
  const articleIds = matchedArticles.map(topic => topic.id);
  const rules: DiagnosisRuleResult[] = [];
  const addRule = (rule: DiagnosisRuleResult) => rules.push(rule);

  const has = (...keywords: string[]) => includesAny(answers, keywords);
  const uncertainCount = answers.filter(value => value.includes('不确定')).length;
  const problemText = input.problemType;

  if (has('鱼浮头喘气', '浮头喘气', '经常浮头', '呼吸明显急促', '急促呼吸', '浮头') && has('有异味', '水发白', '水发绿', '发白', '发绿', '明显浑浊')) {
    addRule({
      ruleId: 'water-breathing-high-risk',
      riskLevel: 'high',
      summary: '鱼浮头并伴随水体异常，优先怀疑缺氧或水质恶化。',
      actions: ['立刻增加打氧或水面扰动', '今天停喂', '少量换水 20%-30%', '检查过滤是否正常出水'],
      avoidActions: ['不要一次性全缸大换水', '不要盲目下药', '不要继续大量喂食'],
      possibleCauses: ['缺氧', '水质恶化', '残饵或有机物污染'],
      observeItems: ['呼吸是否恢复', '是否继续浮头', '水是否仍有异味'],
      missingInfo: ['如无改善，可补充水质检测或异常照片'],
      matchedArticleIds: articleIds,
    });
  }

  if (has('经常浮头', '呼吸明显急促', '急促呼吸') && !has('有异味', '明显浑浊', '水发白', '水发绿', '发白', '发绿')) {
    addRule({
      ruleId: 'frequent-breathing-warning',
      riskLevel: 'high',
      summary: '经常浮头或呼吸明显急促需要优先按缺氧、水温或过滤异常排查。',
      actions: ['立即增加供氧或水面扰动', '检查过滤是否正常出水', '暂停喂食 12-24 小时'],
      avoidActions: ['不要继续加鱼', '不要盲目下药', '不要大幅折腾鱼缸'],
      possibleCauses: ['溶氧不足', '过滤出水异常', '水温或水质波动'],
      observeItems: ['增氧后 30-60 分钟是否缓解', '是否多条鱼同时浮头', '水体是否开始浑浊或有异味'],
      missingInfo: ['氨氮/亚硝酸盐', '过滤出水状态', '水温变化'],
      matchedArticleIds: articleIds,
    });
  }

  if (has('偶尔浮头') && !has('经常浮头', '呼吸明显急促', '有异味', '明显浑浊', '死亡多条', '连续死了多条')) {
    addRule({
      ruleId: 'occasional-breathing-watch',
      riskLevel: 'medium',
      summary: '偶尔浮头更像轻微缺氧、短期应激或环境波动，需要先观察并排查供氧。',
      actions: ['增加水面扰动或短时打氧', '检查过滤出水是否变弱', '减少本次投喂量'],
      avoidActions: ['不要直接下药', '不要一次性大比例换水', '不要继续新增生物'],
      possibleCauses: ['轻微缺氧', '短期应激', '喂食后水体负担增加'],
      observeItems: ['是否变成经常浮头', '是否伴随拒食或趴底', '水体是否浑浊'],
      missingInfo: ['持续时间', '最近投喂量', '过滤和增氧状态'],
      matchedArticleIds: articleIds,
    });
  }

  if (has('连续死了多条', '2-3 条', '多条鱼', '死亡多条', '多条异常', '全缸都异常')) {
    addRule({
      ruleId: 'multiple-death-high-risk',
      riskLevel: 'high',
      summary: '连续死亡或多条异常属于高风险，需要先控制污染源和观察同缸鱼。',
      actions: ['立即捞出死鱼', '今天停喂', '检查水体是否异味或浑浊', '暂时不要加新鱼'],
      avoidActions: ['不要把死鱼留在缸里', '不要原因不明就整缸下猛药', '不要继续新增生物'],
      possibleCauses: ['水质风险', '传染性疾病', '换水/加药刺激'],
      observeItems: ['其他鱼是否浮头', '是否继续死亡', '体表是否有白点或烂尾'],
      missingInfo: ['最近换水/加药/新鱼入缸记录'],
      matchedArticleIds: articleIds,
    });
  }

  if (has('换水', '少量换水', '大比例换水', '清洗过滤', '温差较大', '刚换水') && has('异常', '趴底不动', '浮头喘气', '浮头/呼吸急促', '经常浮头', '呼吸明显急促', '不吃食', '拒食')) {
    addRule({
      ruleId: 'after-water-change-stress',
      riskLevel: 'medium',
      summary: '更像是换水后的短期应激或水质波动。',
      actions: ['增加打氧', '保持温度稳定', '先观察 2-4 小时'],
      avoidActions: ['不要马上再次大换水', '不要频繁捞鱼', '不要盲目下药'],
      possibleCauses: ['温差刺激', '除氯不足', '水质波动'],
      observeItems: ['呼吸是否恢复', '是否继续趴缸', '是否多条鱼异常'],
      missingInfo: ['换水比例和新旧水温差'],
      matchedArticleIds: articleIds,
    });
  }

  if (has('今天刚入缸', '1-3 天', '新鱼', '有新增生物', '刚入缸 1-3 天') && has('躲藏', '长时间躲藏', '不吃食', '拒食', '连续一天不吃')) {
    addRule({
      ruleId: 'new-fish-stress',
      riskLevel: 'medium',
      summary: '新鱼刚入缸躲藏或拒食，多数是应激。',
      actions: ['弱光或关灯半天', '减少打扰', '今天少喂或不喂'],
      avoidActions: ['不要频繁捞出查看', '不要急着下药', '不要当天大量换水'],
      possibleCauses: ['入缸应激', '过水不足', '被追赶'],
      observeItems: ['24-72 小时内是否出来活动', '是否被追咬', '是否浮头或白点'],
      missingInfo: ['是否过水', '是否被原缸鱼追咬'],
      matchedArticleIds: articleIds,
    });
  }

  if (has('吃不完剩很多', '吃不完沉底', '喂多了', '水变浑', '偏多', '有残饵')) {
    addRule({
      ruleId: 'overfeeding-cloudy-water',
      riskLevel: 'medium',
      summary: '更像是投喂过量或残饵导致的水质负担。',
      actions: ['捞出明显残饵', '停喂 12-24 小时', '必要时少量换水 10%-20%'],
      avoidActions: ['不要继续加餐', '不要让残饵过夜', '不要一次性全缸大换水'],
      possibleCauses: ['残饵污染', '过滤压力增加', '喂食量过大'],
      observeItems: ['水是否变清', '鱼腹是否胀大', '是否继续有残饵'],
      missingInfo: ['每次多久吃完'],
      matchedArticleIds: articleIds,
    });
  }

  if (problemText === '追咬打架' || has('明显追咬', '咬伤鳍条', '持续霸占区域', '抢食严重')) {
    addRule({
      ruleId: 'aggression-space-pressure',
      riskLevel: has('咬伤鳍条', '持续霸占区域') ? 'high' : 'medium',
      summary: has('咬伤鳍条', '持续霸占区域') ? '追咬已经影响安全，需要优先降低领地和空间压力。' : '当前有追逐或抢食压力，需要先增加躲避和观察对象。',
      actions: ['增加水草、沉木或石缝作为躲避区', '先暂停继续加入新生物', '观察被追个体是否拒食或受伤'],
      avoidActions: ['不要继续扩大混养组合', '不要频繁追捞所有生物', '不要只靠加饲料缓解抢食'],
      possibleCauses: ['领地压力', '密度偏高', '入缸顺序变化'],
      observeItems: ['是否固定追同一条', '是否出现破鳍或躲藏', '喂食时是否抢食严重'],
      missingInfo: ['追咬对象', '鱼缸长度和躲避空间', '最近是否新增生物'],
      matchedArticleIds: articleIds,
    });
  }

  if (problemText === '水质浑浊 / 异味' || has('轻微浑浊', '明显浑浊', '发白', '发绿', '有异味', '水面油膜')) {
    addRule({
      ruleId: 'water-clarity-check',
      riskLevel: has('有异味', '明显浑浊') ? 'medium' : 'low',
      summary: has('有异味', '明显浑浊') ? '水体已经有明显异常，需要先减负并检查过滤。' : '水体轻微异常，先排查残饵、过滤和近期操作。',
      actions: ['捞出可见残饵和腐败物', '检查过滤是否正常运行', '必要时少量换水 10%-20%'],
      avoidActions: ['不要一次性全缸大换水', '不要继续过量喂食', '不要同时清洗所有滤材'],
      possibleCauses: ['残饵污染', '过滤压力增加', '水体菌相波动'],
      observeItems: ['水是否继续变浑', '是否出现浮头或拒食', '是否有异味加重'],
      missingInfo: ['最近喂食量', '过滤状态', '氨氮/亚硝酸盐'],
      matchedArticleIds: articleIds,
    });
  }

  if (input.problemType === '怀孕/鱼苗') {
    const stage = input.answers.stage || '不确定';
    addRule({
      ruleId: stage.includes('小鱼') ? 'fry-care-flow' : 'pregnancy-care-flow',
      riskLevel: has('被成鱼追', '看不到几条了', '呼吸急促') ? 'medium' : 'low',
      summary: stage.includes('小鱼') ? '当前重点是鱼苗躲避、开口和水流安全。' : '当前重点是确认是否临产，并减少母鱼应激。',
      actions: stage.includes('小鱼')
        ? ['提供隔离或密集水草', '少量多次投喂细颗粒/丰年虾', '清理残饵并避免强水流']
        : ['提供躲避物或隔离盒', '减少追赶和惊吓', '观察母鱼是否临产'],
      avoidActions: ['不要强水流直冲鱼苗', '不要一次投喂太多粉料', '不要频繁移动母鱼'],
      possibleCauses: ['繁殖阶段变化', '成鱼捕食风险', '水流或残饵风险'],
      observeItems: ['是否被成鱼追咬', '是否开口吃食', '水体是否变浑'],
      missingInfo: ['鱼种', '鱼苗出生时间'],
      matchedArticleIds: articleIds,
    });
  }

  if (input.problemType === '巡检' && rules.length === 0) {
    addRule({
      ruleId: 'normal-patrol',
      riskLevel: input.snapshot.riskCount && input.snapshot.riskCount > 0 ? 'medium' : 'low',
      summary: input.snapshot.riskCount && input.snapshot.riskCount > 0 ? '当前鱼缸有提醒，建议先做轻量观察。' : '当前未发现明显异常，可以正常观察。',
      actions: input.snapshot.riskCount && input.snapshot.riskCount > 0 ? ['观察鱼是否浮头或趴缸', '检查水体是否异味', '记录今日状态'] : ['正常观察', '记录喂食或换水', '发现异常再进入对应诊断'],
      avoidActions: ['不要无症状盲目下药', '不要频繁大换水'],
      possibleCauses: input.snapshot.riskCount && input.snapshot.riskCount > 0 ? ['混养或水体提醒'] : ['暂无明显异常'],
      observeItems: ['呼吸频率', '抢食状态', '水体异味'],
      missingInfo: [],
      matchedArticleIds: articleIds,
    });
  }

  if (rules.length === 0) {
    addRule({
      ruleId: 'generic-symptom-check',
      riskLevel: uncertainCount >= Math.max(2, Math.ceil(answers.length / 2)) ? 'unknown' : 'low',
      summary: uncertainCount >= Math.max(2, Math.ceil(answers.length / 2)) ? '当前信息不足，建议先补充观察和水质信息。' : '目前没有命中高风险规则，先做轻量排查和短期观察。',
      actions: ['记录异常出现时间和影响范围', '检查过滤出水、水温和水体气味', '把下一次投喂控制在 2-3 分钟内吃完'],
      avoidActions: ['不要盲目下药', '不要频繁捞鱼', '不要突然大比例换水'],
      possibleCauses: ['信息不足', '轻微应激', '环境波动'],
      observeItems: ['呼吸是否急促', '是否继续拒食', '水体是否异常'],
      missingInfo: ['异常持续时间', '照片或视频描述'],
      matchedArticleIds: articleIds,
    });
  }

  return rules;
};

export const buildDiagnosisResult = (input: BuildDiagnosisInput): DiagnosisOutput => {
  const rules = evaluateDiagnosisRules(input);
  const highest = rules.reduce((best, current) => (
    riskPriority[current.riskLevel] > riskPriority[best.riskLevel] ? current : best
  ), rules[0]);
  const matchedTopics = matchCareArticles(input.problemType, input.answers, input.careTopics);
  const answerEvidence = Object.entries(input.answers)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${key}：${value}`)
    .slice(0, 4);
  const recentEvidence = (input.previousDiagnosisRecords || [])
    .slice(0, 2)
    .map(record => `最近诊断：${record.problemType || '未知'} ${record.riskLevel || ''}`.trim());

  return {
    riskLevel: highest.riskLevel,
    riskLabel: riskLabelMap[highest.riskLevel],
    summary: highest.summary,
    currentAction: highest.actions[0] || '先观察',
    actions: unique(rules.flatMap(rule => rule.actions)).slice(0, 3),
    avoidActions: unique(rules.flatMap(rule => rule.avoidActions)).slice(0, 3),
    possibleCauses: unique(rules.flatMap(rule => rule.possibleCauses)).slice(0, 3),
    observeItems: unique(rules.flatMap(rule => rule.observeItems)).slice(0, 3),
    missingInfo: unique(rules.flatMap(rule => rule.missingInfo)).slice(0, 3),
    evidence: unique([
      `来自当前鱼缸：${input.snapshot.waterType} · ${input.snapshot.temperature} · ${input.snapshot.stocked}`,
      ...(input.sourceContext?.title ? [`入口：${input.sourceContext.title}`] : []),
      ...answerEvidence,
      ...recentEvidence,
      ...(matchedTopics[0] ? [`匹配百科：${matchedTopics[0].title}`] : []),
    ]).slice(0, 6),
    keyMetrics: [
      { label: '问题类型', value: input.problemType },
      { label: '风险等级', value: riskLabelMap[highest.riskLevel] },
      { label: '最近换水', value: input.snapshot.recentWaterChange },
      { label: '最近喂食', value: input.snapshot.recentFeeding },
    ].filter(item => item.value),
    matchedRules: rules.map(rule => rule.ruleId),
    matchedArticles: matchedTopics.map(topic => ({
      id: topic.id,
      title: topic.title,
      category: topic.category,
      summary: topic.summary,
    })),
    nextCheckAt: addDaysIso(highest.riskLevel === 'high' ? 1 : 2),
  };
};

export const generateAiDiagnosisSummary = async (input: AiDiagnosisInput): Promise<DiagnosisOutput> => {
  const result = buildDiagnosisResult({
    aquarium: { id: input.aquariumSnapshot.aquariumId, name: '', fishes: [] },
    snapshot: input.aquariumSnapshot,
    problemType: input.problemType,
    answers: input.userAnswers,
    careTopics: input.matchedArticles,
    previousDiagnosisRecords: input.previousDiagnosisRecords as Array<{ problemType?: string; riskLevel?: string; resultSummary?: string; createdAt?: string }>,
  });
  return result;
};
