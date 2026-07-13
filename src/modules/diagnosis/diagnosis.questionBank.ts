import type { DiagnosisAnswerMap, DiagnosisProblemType, DiagnosisQuestion } from './diagnosis.types';

export const diagnosisProblemTypes: Array<{ id: DiagnosisProblemType; label: string; description: string }> = [
  { id: '鱼浮头 / 呼吸急促', label: '鱼浮头 / 呼吸急促', description: '判断缺氧、水质波动或短期应激' },
  { id: '拒食', label: '拒食', description: '判断新鱼应激、追咬压力、喂食或水质问题' },
  { id: '躲藏不动', label: '躲藏不动', description: '判断应激、被追赶、温度或水质波动' },
  { id: '追咬打架', label: '追咬打架', description: '判断领地、密度、躲避空间和入缸顺序' },
  { id: '死亡 / 异常死亡', label: '死亡 / 异常死亡', description: '处理死亡个体、连续死亡和污染风险' },
  { id: '水质浑浊 / 异味', label: '水质浑浊 / 异味', description: '判断残饵、过滤、换水和水质负担' },
  { id: '虾类死亡', label: '虾类死亡', description: '判断换水刺激、铜药、水质和蜕壳风险' },
  { id: '水草黄叶 / 烂叶', label: '水草黄叶 / 烂叶', description: '判断光照、肥力、CO2 和适应期' },
  { id: '巡检', label: '只做巡检', description: '检查整体状态、水质、喂食和换水是否正常' },
  { id: '水质异常', label: '水质异常', description: '适合水发白、发绿、有异味、鱼浮头' },
  { id: '鱼只异常', label: '鱼只异常', description: '适合趴缸、浮头、拒食、白点或烂尾' },
  { id: '新鱼入缸', label: '新鱼入缸', description: '适合新鱼躲藏、拒食、被追赶或状态不稳' },
  { id: '喂食问题', label: '喂食问题', description: '判断投喂量、残饵、水浑和腹胀风险' },
  { id: '怀孕/鱼苗', label: '怀孕 / 鱼苗', description: '处理母鱼待产、鱼苗开口和隔离照料' },
  { id: '死亡处理', label: '死亡处理', description: '死鱼移除、连续死亡和水质风险排查' },
  { id: '换水', label: '换水 / 安全换水', description: '判断能不能换水、换多少、怎么换更稳' },
  { id: '设备异常', label: '设备异常', description: '过滤、加热、气泵或灯光异常排查' },
];

const baseQuestionBank: Record<DiagnosisProblemType, DiagnosisQuestion[]> = {
  '鱼浮头 / 呼吸急促': [
    { id: 'gasping', question: '是否看到鱼浮头或呼吸急促？', options: ['没有', '偶尔浮头', '经常浮头', '呼吸明显急促', '不确定'] },
    { id: 'cloudyWater', question: '水体是否浑浊、发白或有异味？', options: ['清澈无异味', '轻微浑浊', '明显浑浊', '有异味', '不确定'] },
    { id: 'recentWaterChange', question: '最近 48 小时是否换水或清洗过滤？', options: ['没有', '少量换水', '大比例换水', '清洗过滤', '不确定'] },
    { id: 'feedingAmount', question: '最近投喂量如何？', options: ['正常', '偏多', '有残饵', '今天没喂', '不确定'] },
    { id: 'deaths', question: '是否有死亡个体？', options: ['没有', '死亡 1 条', '死亡多条', '不确定'] },
  ],
  拒食: [
    { id: 'feedingResponse', question: '拒食程度如何？', options: ['偶尔不吃', '连续一天不吃', '连续多天不吃', '全缸都不吃', '不确定'] },
    { id: 'recentNewFish', question: '最近 7 天是否新增生物？', options: ['没有', '有新增生物', '刚入缸 1-3 天', '不确定'] },
    { id: 'chasing', question: '是否有追咬或抢食压力？', options: ['没有', '偶尔追', '明显追咬', '抢食严重', '不确定'] },
    { id: 'waterLook', question: '水体是否异常？', options: ['清澈', '发白', '有异味', '水面油膜', '不确定'] },
  ],
  躲藏不动: [
    { id: 'hiding', question: '躲藏或不动的程度？', options: ['偶尔躲藏', '长时间躲藏', '趴底不动', '全缸都异常', '不确定'] },
    { id: 'recentNewFish', question: '最近 7 天是否新增生物？', options: ['没有', '有新增生物', '刚入缸 1-3 天', '不确定'] },
    { id: 'chasing', question: '是否有追咬或被压迫？', options: ['没有', '偶尔追', '明显追咬', '不确定'] },
    { id: 'temperatureChange', question: '水温是否波动？', options: ['稳定', '略有波动', '明显波动', '不确定'] },
  ],
  追咬打架: [
    { id: 'aggression', question: '追咬程度如何？', options: ['偶尔追逐', '明显追咬', '咬伤鳍条', '持续霸占区域', '不确定'] },
    { id: 'newFish', question: '最近是否新增生物？', options: ['没有', '有新增生物', '刚调整鱼缸布局', '不确定'] },
    { id: 'hidingSpace', question: '缸里躲避空间是否足够？', options: ['足够', '一般', '几乎没有', '不确定'] },
    { id: 'density', question: '当前密度看起来如何？', options: ['不拥挤', '略拥挤', '很拥挤', '不确定'] },
  ],
  '死亡 / 异常死亡': [
    { id: 'deathCount', question: '死了几条？', options: ['1 条', '死亡 1 条', '死亡多条', '连续死了多条', '不确定'] },
    { id: 'waterLook', question: '水有没有异常？', options: ['清澈', '发白', '有异味', '水面油膜', '不确定'] },
    { id: 'recentAction', question: '最近 48 小时做过什么？', options: ['没有', '换水', '加药', '新鱼入缸', '喂多了', '不确定'] },
    { id: 'otherSymptoms', question: '其他生物是否异常？', options: ['没有', '浮头', '拒食', '趴缸', '多条异常', '不确定'] },
  ],
  '水质浑浊 / 异味': [
    { id: 'waterLook', question: '水体主要问题是什么？', options: ['轻微浑浊', '明显浑浊', '发白', '发绿', '有异味', '水面油膜', '不确定'] },
    { id: 'feedingAmount', question: '最近是否过量喂食？', options: ['正常', '偏多', '有残饵', '不确定'] },
    { id: 'filterStatus', question: '过滤是否正常运行？', options: ['正常', '水流变弱', '刚清洗过滤', '停过过滤', '不确定'] },
    { id: 'fishBehavior', question: '生物状态是否异常？', options: ['没有', '浮头', '拒食', '趴缸', '死亡', '不确定'] },
  ],
  虾类死亡: [
    { id: 'shrimpDeathCount', question: '虾类死亡数量？', options: ['1 只', '多只', '连续死亡', '不确定'] },
    { id: 'recentWaterChange', question: '最近 48 小时是否换水？', options: ['没有', '少量换水', '大比例换水', '不确定'] },
    { id: 'chemicalRisk', question: '最近是否用药或除藻剂？', options: ['没有', '用过药', '用过除藻剂', '不确定'] },
    { id: 'waterLook', question: '水体是否异常？', options: ['清澈', '发白', '有异味', '不确定'] },
  ],
  '水草黄叶 / 烂叶': [
    { id: 'plantSymptom', question: '水草主要表现？', options: ['黄叶', '烂叶', '融叶', '长藻', '停止生长', '不确定'] },
    { id: 'lighting', question: '灯光情况如何？', options: ['正常 6-8 小时', '时间太短', '时间太长', '刚换灯', '不确定'] },
    { id: 'substrate', question: '底床或肥力情况？', options: ['水草泥/根肥正常', '没有肥力底床', '刚翻动底床', '不确定'] },
    { id: 'livestockNibbling', question: '是否有生物啃草或翻底？', options: ['没有', '有啃草', '有翻底', '不确定'] },
  ],
  巡检: [
    { id: 'breathing', question: '鱼是否浮头或呼吸急促？', options: ['正常', '偶尔浮头', '经常浮头', '呼吸明显急促', '不确定'] },
    { id: 'waterLook', question: '水体是否发白、发绿或浑浊？', options: ['清澈', '轻微浑浊', '明显浑浊', '发白', '发绿', '不确定'] },
    { id: 'surfaceLook', question: '水面是否有持续泡沫或油膜？', options: ['没有泡沫或油膜', '少量短暂泡沫', '持续泡沫', '水面油膜', '不确定'] },
    { id: 'odor', question: '鱼缸是否出现异味？', options: ['没有异味', '轻微腥味', '明显异味', '不确定'] },
    { id: 'behavior', question: '鱼是否拒食、趴底、躲藏或追咬？', options: ['正常游动和进食', '拒食', '趴底不动', '持续躲藏', '追咬打架', '不确定'] },
    { id: 'recentAction', question: '最近 48 小时做过什么？', options: ['没有特别操作', '换水', '清洗过滤', '喂多了', '加药', '新增生物', '不确定'] },
    { id: 'userDescription', question: '还有其他情况想补充吗？', options: ['跳过'], optionalText: true },
  ],
  水质异常: [
    { id: 'mainProblem', question: '你看到的主要问题是什么？', options: ['水发白', '水发绿', '有异味', '水面油膜', '鱼浮头喘气', '不确定'] },
    { id: 'duration', question: '这个问题出现多久了？', options: ['今天刚出现', '1-2 天', '3 天以上', '不确定'] },
    { id: 'recentAction', question: '最近做过什么？', options: ['喂多了', '换水', '清洗过滤', '新鱼入缸', '没有', '不确定'] },
    { id: 'fishBehavior', question: '鱼有没有异常？', options: ['没有', '浮头喘气', '趴底不动', '不吃食', '多条鱼异常', '不确定'] },
  ],
  鱼只异常: [
    { id: 'symptom', question: '鱼主要是什么表现？', options: ['浮头喘气', '趴底不动', '不吃食', '身上白点', '烂尾烂鳍', '擦缸蹭缸', '不确定'] },
    { id: 'scope', question: '是一条鱼还是多条鱼？', options: ['一条鱼', '多条鱼', '全缸都异常', '不确定'] },
    { id: 'newFish', question: '最近 7 天是否加过新鱼？', options: ['是', '没有', '不确定'] },
    { id: 'waterLook', question: '水看起来是否异常？', options: ['清澈', '发白', '有异味', '水面油膜', '不确定'] },
  ],
  新鱼入缸: [
    { id: 'entryTime', question: '新鱼入缸多久了？', options: ['今天刚入缸', '1-3 天', '4-7 天', '超过一周', '不确定'] },
    { id: 'acclimation', question: '入缸前有没有过水？', options: ['过温和过水都做了', '只泡袋对温', '直接入缸', '不确定'] },
    { id: 'behavior', question: '新鱼现在状态？', options: ['正常', '躲藏', '不吃食', '浮头喘气', '被追赶', '不确定'] },
    { id: 'chasing', question: '原缸鱼有没有追咬？', options: ['没有', '偶尔追', '明显追咬', '不确定'] },
  ],
  喂食问题: [
    { id: 'feedingProblem', question: '你遇到的是什么情况？', options: ['不知道喂多少', '鱼不吃', '吃不完剩很多', '水变浑', '不确定'] },
    { id: 'finishTime', question: '投喂后多久吃完？', options: ['2 分钟内', '5 分钟内', '吃不完沉底', '不确定'] },
    { id: 'fishStatus', question: '鱼现在状态？', options: ['正常', '腹胀', '抢食明显', '不吃食', '不确定'] },
  ],
  '怀孕/鱼苗': [
    { id: 'stage', question: '你现在是哪种情况？', options: ['母鱼肚子变大', '已经看到小鱼', '不知道是不是怀孕'] },
  ],
  死亡处理: [
    { id: 'deathCount', question: '死了几条？', options: ['1 条', '2-3 条', '连续死了多条', '不确定'] },
    { id: 'fishAge', question: '是新鱼还是养了一段时间的鱼？', options: ['新鱼', '养了一段时间', '都有', '不确定'] },
    { id: 'waterLook', question: '水有没有异常？', options: ['清澈', '发白', '有异味', '水面油膜', '不确定'] },
    { id: 'recentAction', question: '最近 48 小时做过什么？', options: ['换水', '加药', '新鱼入缸', '喂多了', '没有', '不确定'] },
  ],
  换水: [
    { id: 'plannedPercent', question: '这次准备换多少水？', options: ['10%', '20%', '30%', '不确定'] },
    { id: 'waterPrep', question: '新水准备好了吗？', options: ['已困水', '使用除氯剂', '还没处理', '不确定'] },
    { id: 'tempMatch', question: '新水和缸内水温接近吗？', options: ['接近', '可能差 1-2°C', '温差较大', '不确定'] },
    { id: 'fishStatus', question: '鱼现在状态如何？', options: ['正常', '浮头/呼吸急促', '趴缸/躲藏', '不确定'] },
  ],
  设备异常: [
    { id: 'device', question: '哪个设备异常？', options: ['过滤', '加热棒', '氧气/气泵', '灯光', '不确定'] },
    { id: 'duration', question: '异常持续多久？', options: ['刚发现', '几小时', '一天以上', '不确定'] },
    { id: 'fishBehavior', question: '鱼是否有异常表现？', options: ['没有', '浮头喘气', '急促呼吸', '趴缸', '不确定'] },
    { id: 'recovered', question: '是否已经恢复设备？', options: ['已恢复', '未恢复', '不确定'] },
  ],
};

const pregnancyBranchQuestions: DiagnosisQuestion[] = [
  { id: 'motherStatus', question: '母鱼状态怎么样？', options: ['正常游动', '躲在角落', '呼吸急促', '被追赶', '不确定'] },
  { id: 'hidingPlace', question: '缸里有没有躲避物？', options: ['有密集水草', '有隔离盒', '没有', '不确定'] },
  { id: 'tankmates', question: '同缸有没有会吃鱼苗的成鱼？', options: ['有', '没有', '不确定'] },
];

const fryBranchQuestions: DiagnosisQuestion[] = [
  { id: 'fryAge', question: '小鱼出生多久了？', options: ['今天刚出生', '1-3 天', '4-7 天', '超过一周', '不确定'] },
  { id: 'fryLocation', question: '小鱼现在在哪里？', options: ['隔离盒', '主缸水草里', '被成鱼追', '看不到几条了', '不确定'] },
  { id: 'fryFeeding', question: '鱼苗有没有开始吃东西？', options: ['还没喂', '会吃', '不会吃', '不确定'] },
];

const uncertainPregnancyQuestions: DiagnosisQuestion[] = [
  { id: 'bellyShape', question: '母鱼肚子形状更像哪种？', options: ['明显变方', '只是变圆', '看不出来', '不确定'] },
  { id: 'behavior', question: '母鱼最近行为怎么样？', options: ['正常', '躲藏', '被追', '呼吸急促', '不确定'] },
  { id: 'speciesType', question: '是哪类鱼？', options: ['孔雀/月光/玛丽', '灯鱼/卵生鱼', '不确定'] },
];

export const getDiagnosisQuestions = (problemType: DiagnosisProblemType, answers: DiagnosisAnswerMap = {}) => {
  if (problemType !== '怀孕/鱼苗') return baseQuestionBank[problemType] || baseQuestionBank.巡检;

  const first = baseQuestionBank['怀孕/鱼苗'];
  const stage = answers.stage;
  if (stage === '母鱼肚子变大') return [...first, ...pregnancyBranchQuestions];
  if (stage === '已经看到小鱼') return [...first, ...fryBranchQuestions];
  if (stage === '不知道是不是怀孕') return [...first, ...uncertainPregnancyQuestions];
  return first;
};

export const getEstimatedQuestionCount = (problemType: DiagnosisProblemType) => {
  if (problemType === '怀孕/鱼苗') return 4;
  return (baseQuestionBank[problemType] || baseQuestionBank.巡检).length;
};

export const isDiagnosisProblemType = (value: string): value is DiagnosisProblemType => (
  value in baseQuestionBank
);
