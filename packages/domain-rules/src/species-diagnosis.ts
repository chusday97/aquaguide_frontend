import type {
  DiagnosisHypothesis,
  DiagnosticFollowUpQuestion,
  DiagnosisUrgency,
  SpeciesDiagnosisStepInput,
  SpeciesDiagnosisStepOutput,
  SymptomObservation,
} from '../../contracts/src/species-diagnosis';

type QuestionDefinition = DiagnosticFollowUpQuestion & {
  distinguishes: string[];
  applies: (observations: Map<string, string>) => boolean;
};

type HypothesisDefinition = Omit<DiagnosisHypothesis, 'likelihood' | 'supportingEvidence' | 'contradictingEvidence' | 'missingEvidence'> & {
  supports: Record<string, string[]>;
  contradicts: Record<string, string[]>;
  needs: string[];
};

const zhQuestions: QuestionDefinition[] = [
  {
    id: 'scope',
    prompt: '现在是几条鱼出现异常？',
    reason: '单条异常与全缸同时异常的处理优先级不同。',
    options: [
      { id: 'single', label: '只有这一条' },
      { id: 'several', label: '有几条' },
      { id: 'all', label: '几乎全缸' },
      { id: 'unknown', label: '暂时看不清' },
    ],
    redFlag: true,
    distinguishes: ['oxygen_shortage', 'water_quality', 'acclimation_stress', 'individual_injury'],
    applies: observations => !observations.has('scope'),
  },
  {
    id: 'breathing',
    prompt: '它的呼吸和所在位置更接近哪种？',
    reason: '浮头或急促呼吸需要先排除缺氧和急性水质问题。',
    options: [
      { id: 'surface_gasping', label: '水面浮头喘气' },
      { id: 'rapid', label: '呼吸明显急促' },
      { id: 'normal', label: '呼吸看起来正常' },
      { id: 'unknown', label: '无法判断' },
    ],
    redFlag: true,
    distinguishes: ['oxygen_shortage', 'water_quality', 'acclimation_stress'],
    applies: observations => !observations.has('breathing'),
  },
  {
    id: 'posture',
    prompt: '它现在能保持正常姿态吗？',
    reason: '侧躺、翻肚或失去平衡会提高紧急程度。',
    options: [
      { id: 'upright', label: '能正常保持姿态' },
      { id: 'bottom', label: '趴底但身体正直' },
      { id: 'sideways', label: '侧躺或失去平衡' },
      { id: 'unknown', label: '看不清' },
    ],
    redFlag: true,
    distinguishes: ['oxygen_shortage', 'water_quality', 'individual_injury'],
    applies: observations => !observations.has('posture'),
  },
  {
    id: 'recent_change',
    prompt: '异常前 48 小时内发生过什么？',
    reason: '新鱼入缸、换水、清洗过滤或加药常能区分应激与水质波动。',
    options: [
      { id: 'new_fish', label: '刚入缸或刚换环境' },
      { id: 'water_filter', label: '换水或清洗过滤' },
      { id: 'medicine', label: '加药或添加剂' },
      { id: 'overfeed', label: '可能喂多了' },
      { id: 'none', label: '没有明显变化' },
    ],
    redFlag: false,
    distinguishes: ['water_quality', 'acclimation_stress', 'feeding_stress'],
    applies: observations => !observations.has('recent_change'),
  },
  {
    id: 'external_signs',
    prompt: '体表有没有明显变化？',
    reason: '白点、破损和充血能帮助区分外观异常与单纯环境应激。',
    options: [
      { id: 'spots', label: '有白点或异常附着' },
      { id: 'damage', label: '有破损、夹尾或充血' },
      { id: 'none', label: '暂未看到异常' },
      { id: 'unknown', label: '看不清' },
    ],
    redFlag: false,
    distinguishes: ['external_disease', 'aggression_injury', 'acclimation_stress'],
    applies: observations => !observations.has('external_signs'),
  },
];

const enText = {
  questions: {
    scope: ['How many fish are affected?', 'A single fish and most of the tank require different priorities.', ['Only this fish', 'Several fish', 'Most of the tank', 'Not sure']],
    breathing: ['Which best describes its breathing and position?', 'Surface gasping or rapid breathing requires an oxygen and water-quality check first.', ['Gasping at the surface', 'Breathing rapidly', 'Breathing looks normal', 'Not sure']],
    posture: ['Can it keep a normal upright posture?', 'Lying on its side or losing balance increases urgency.', ['Upright', 'On the bottom but upright', 'Sideways or losing balance', 'Not sure']],
    recent_change: ['What changed in the last 48 hours?', 'A new environment, water change, filter cleaning, or medication can separate stress from water instability.', ['New fish or new environment', 'Water change or filter cleaning', 'Medication or additive', 'Possible overfeeding', 'No obvious change']],
    external_signs: ['Do you see any visible body changes?', 'Spots, damage, or redness help separate visible disease signs from environmental stress.', ['Spots or unusual coating', 'Damage, clamped fins, or redness', 'No visible change', 'Not sure']],
  } as Record<string, [string, string, string[]]>,
};

const hypotheses: HypothesisDefinition[] = [
  {
    code: 'oxygen_shortage',
    label: '缺氧或水面气体交换不足',
    urgency: 'urgent',
    recommendedActions: ['立即增强水面扰动并开启增氧', '确认过滤出水正常，持续观察呼吸'],
    avoidActions: ['不要先下药', '不要一次性全缸换水'],
    recommendedArticleIds: ['guide_water_deteriorate'],
    supports: { scope: ['all', 'several'], breathing: ['surface_gasping', 'rapid'], posture: ['sideways'] },
    contradicts: { breathing: ['normal'], scope: ['single'] },
    needs: ['scope', 'breathing'],
  },
  {
    code: 'water_quality',
    label: '急性水质波动或过滤异常',
    urgency: 'urgent',
    recommendedActions: ['先增氧并检查过滤是否正常出水', '准备分次少量换水并观察其他鱼'],
    avoidActions: ['不要同时大量换水、洗滤材和下药'],
    recommendedArticleIds: ['guide_water_deteriorate', 'guide_safe_water_change'],
    supports: { scope: ['all', 'several'], recent_change: ['water_filter', 'medicine', 'overfeed'], breathing: ['rapid', 'surface_gasping'] },
    contradicts: { scope: ['single'], recent_change: ['none'] },
    needs: ['scope', 'recent_change'],
  },
  {
    code: 'acclimation_stress',
    label: '新环境适应或短期应激',
    urgency: 'watch',
    recommendedActions: ['保持安静和弱光，减少追逐与反复打扰', '持续观察呼吸、姿态和是否恢复活动'],
    avoidActions: ['不要反复捞鱼或立即混合用药'],
    recommendedArticleIds: ['guide_new_fish_acclimation'],
    supports: { scope: ['single'], recent_change: ['new_fish'], breathing: ['normal'], external_signs: ['none'] },
    contradicts: { scope: ['all'], breathing: ['surface_gasping'], posture: ['sideways'] },
    needs: ['recent_change', 'breathing'],
  },
  {
    code: 'aggression_injury',
    label: '追咬、压迫或外伤',
    urgency: 'watch',
    recommendedActions: ['观察是否被持续追逐并准备临时隔离', '检查鳍条、体表和游姿'],
    avoidActions: ['不要在未确认追咬前反复捞动全缸生物'],
    recommendedArticleIds: [],
    supports: { scope: ['single'], external_signs: ['damage'] },
    contradicts: { scope: ['all'], external_signs: ['none'] },
    needs: ['scope', 'external_signs'],
  },
  {
    code: 'external_disease',
    label: '体表异常或感染迹象',
    urgency: 'watch',
    recommendedActions: ['先隔离观察并拍清晰近照记录变化', '核对是否有白点、黏液、充血或鳍条破损'],
    avoidActions: ['不要仅凭照片直接混合用药'],
    recommendedArticleIds: [],
    supports: { external_signs: ['spots'], recent_change: ['none'] },
    contradicts: { external_signs: ['none'] },
    needs: ['external_signs'],
  },
  {
    code: 'individual_injury',
    label: '个体损伤或体力衰弱',
    urgency: 'watch',
    recommendedActions: ['降低干扰并观察游姿、呼吸和体表', '若持续侧躺或无法游动，准备隔离和增氧'],
    avoidActions: ['不要强行喂食或反复触碰'],
    recommendedArticleIds: [],
    supports: { scope: ['single'], posture: ['sideways', 'bottom'] },
    contradicts: { scope: ['all'], posture: ['upright'] },
    needs: ['scope', 'posture'],
  },
];

const observation = (code: string, value: string, source: SymptomObservation['source'], evidence?: string): SymptomObservation => ({
  code,
  value,
  source,
  ...(evidence ? { evidence } : {}),
});

export const parseLocalSymptomObservations = (description: string): SymptomObservation[] => {
  const text = description.toLowerCase();
  const found: SymptomObservation[] = [];
  const add = (code: string, value: string, evidence: string) => {
    if (!found.some(item => item.code === code)) found.push(observation(code, value, 'user_text', evidence));
  };

  if (/(全缸|全部|所有|most|all fish)/i.test(text)) add('scope', 'all', '用户描述多条或全缸同时异常');
  else if (/(几条|多条|several|multiple)/i.test(text)) add('scope', 'several', '用户描述多条生物异常');
  else if (/(单条|一条|这条|one fish|single)/i.test(text)) add('scope', 'single', '用户描述单个个体异常');
  if (/(浮头|水面喘|surface|gasp)/i.test(text)) add('breathing', 'surface_gasping', '用户描述浮头或在水面喘气');
  else if (/(急促呼吸|喘得快|rapid breath|breathing fast)/i.test(text)) add('breathing', 'rapid', '用户描述呼吸急促');
  if (/(侧躺|翻肚|失去平衡|sideways|on its side)/i.test(text)) add('posture', 'sideways', '用户描述无法保持正常姿态');
  else if (/(趴底|沉底|bottom)/i.test(text)) add('posture', 'bottom', '用户描述趴底');
  if (/(新鱼|刚入缸|刚买|new fish|new tank)/i.test(text)) add('recent_change', 'new_fish', '用户描述近期入缸或更换环境');
  else if (/(换水|洗滤|清洗过滤|water change|filter clean)/i.test(text)) add('recent_change', 'water_filter', '用户描述近期换水或清洗过滤');
  else if (/(加药|下药|medication|medicine)/i.test(text)) add('recent_change', 'medicine', '用户描述近期加药');
  if (/(白点|白膜|spots|white spot)/i.test(text)) add('external_signs', 'spots', '用户描述体表有异常附着');
  else if (/(破损|烂尾|充血|夹尾|damage|redness|clamped)/i.test(text)) add('external_signs', 'damage', '用户描述体表或鳍条受损');
  if (/(躲|不动|趴缸|inactive|hiding|not moving)/i.test(text)) add('activity', 'inactive', '用户描述活动明显减少');
  if (/(拒食|不吃|not eating|refus)/i.test(text)) add('feeding', 'refusing', '用户描述拒食');
  return found;
};

const localizeQuestion = (question: QuestionDefinition, locale: SpeciesDiagnosisStepInput['locale']): DiagnosticFollowUpQuestion => {
  if (locale !== 'en') {
    const { distinguishes: _distinguishes, applies: _applies, ...publicQuestion } = question;
    return publicQuestion;
  }
  const translated = enText.questions[question.id];
  return {
    id: question.id,
    prompt: translated[0],
    reason: translated[1],
    options: question.options.map((option, index) => ({ ...option, label: translated[2][index] || option.label })),
    redFlag: question.redFlag,
  };
};

const mergeObservations = (
  input: SpeciesDiagnosisStepInput,
  aiObservations: SymptomObservation[] = [],
) => {
  const allowedCodes = new Set(['scope', 'breathing', 'posture', 'recent_change', 'external_signs', 'activity', 'feeding']);
  const byCode = new Map<string, SymptomObservation>();
  for (const item of parseLocalSymptomObservations(input.userDescription)) byCode.set(item.code, item);
  for (const item of aiObservations) {
    if (allowedCodes.has(item.code) && !byCode.has(item.code)) byCode.set(item.code, { ...item, source: 'user_text' });
  }
  for (const [code, value] of Object.entries(input.answers)) byCode.set(code, observation(code, value, 'answer'));
  if (input.aquariumSnapshot.equipment) byCode.set('tank_equipment', observation('tank_equipment', input.aquariumSnapshot.equipment, 'tank'));
  return byCode;
};

const scoreHypothesis = (definition: HypothesisDefinition, observations: Map<string, SymptomObservation>) => {
  let score = 0;
  const supportingEvidence: string[] = [];
  const contradictingEvidence: string[] = [];
  for (const [code, values] of Object.entries(definition.supports)) {
    const current = observations.get(code);
    if (current && values.includes(current.value)) {
      score += 2;
      supportingEvidence.push(current.evidence || `${code}: ${current.value}`);
    }
  }
  for (const [code, values] of Object.entries(definition.contradicts)) {
    const current = observations.get(code);
    if (current && values.includes(current.value)) {
      score -= 2;
      contradictingEvidence.push(current.evidence || `${code}: ${current.value}`);
    }
  }
  const missingEvidence = definition.needs.filter(code => !observations.has(code));
  return { score, supportingEvidence, contradictingEvidence, missingEvidence };
};

const selectNextQuestion = (
  observations: Map<string, SymptomObservation>,
  askedQuestionIds: string[],
  activeHypotheses: Array<{ code: string; score: number }>,
) => {
  const available = zhQuestions.filter(question => !askedQuestionIds.includes(question.id) && question.applies(new Map(Array.from(observations, ([key, value]) => [key, value.value]))));
  if (available.length === 0) return undefined;

  const hasAcuteSignal = observations.get('breathing')?.value === 'surface_gasping'
    || observations.get('breathing')?.value === 'rapid'
    || observations.get('posture')?.value === 'sideways'
    || observations.get('scope')?.value === 'all';
  const redFlag = available.find(question => question.redFlag && (hasAcuteSignal || question.id === 'scope' || question.id === 'breathing'));
  if (redFlag) return redFlag;

  const activeCodes = new Set(activeHypotheses.filter(item => item.score >= 0).map(item => item.code));
  return [...available].sort((left, right) => {
    const rightGain = right.distinguishes.filter(code => activeCodes.has(code)).length;
    const leftGain = left.distinguishes.filter(code => activeCodes.has(code)).length;
    return rightGain - leftGain || zhQuestions.indexOf(left) - zhQuestions.indexOf(right);
  })[0];
};

const urgencyRank: Record<DiagnosisUrgency, number> = { routine: 1, watch: 2, urgent: 3 };

export const buildSpeciesDiagnosisStep = (
  input: SpeciesDiagnosisStepInput,
  aiObservations: SymptomObservation[] = [],
  source: SpeciesDiagnosisStepOutput['source'] = 'fallback',
  failureReason?: SpeciesDiagnosisStepOutput['failureReason'],
): SpeciesDiagnosisStepOutput => {
  const observations = mergeObservations(input, aiObservations);
  const scored = hypotheses
    .map(definition => ({ definition, ...scoreHypothesis(definition, observations) }))
    .sort((left, right) => right.score - left.score || urgencyRank[right.definition.urgency] - urgencyRank[left.definition.urgency]);
  const visible = scored.slice(0, 3);
  const acute = observations.get('breathing')?.value === 'surface_gasping'
    || observations.get('breathing')?.value === 'rapid'
    || observations.get('posture')?.value === 'sideways'
    || (observations.get('scope')?.value === 'all' && observations.get('activity')?.value === 'inactive');
  const urgency: DiagnosisUrgency = acute
    ? 'urgent'
    : visible.some(item => item.score >= 2 && item.definition.urgency === 'watch')
      ? 'watch'
      : 'routine';
  const next = input.askedQuestionIds.length >= 3
    ? undefined
    : selectNextQuestion(observations, input.askedQuestionIds, scored.map(item => ({ code: item.definition.code, score: item.score })));
  const emergencyActions = urgency === 'urgent'
    ? ['立即增强水面扰动并开启增氧', '确认过滤正常出水，观察是否有更多鱼同时异常']
    : [];

  return {
    observations: Array.from(observations.values()),
    urgency,
    emergencyActions,
    ...(next ? { nextQuestion: localizeQuestion(next, input.locale) } : {}),
    hypotheses: visible.map(({ definition, score, supportingEvidence, contradictingEvidence, missingEvidence }) => ({
      code: definition.code,
      label: input.locale === 'en' ? definition.code.replaceAll('_', ' ') : definition.label,
      likelihood: score >= 3 ? 'more_likely' : score >= 1 ? 'possible' : 'cannot_rule_out',
      urgency: definition.urgency,
      supportingEvidence,
      contradictingEvidence,
      missingEvidence,
      recommendedActions: definition.recommendedActions,
      avoidActions: definition.avoidActions,
      recommendedArticleIds: definition.recommendedArticleIds,
    })),
    complete: !next,
    disclaimer: input.locale === 'en'
      ? 'This is risk triage and care guidance, not a diagnosis or medication instruction.'
      : '这是风险分诊和养护引导，不是疾病确诊或自动用药建议。',
    source,
    ...(failureReason ? { failureReason } : {}),
    generatedAt: new Date().toISOString(),
  };
};
