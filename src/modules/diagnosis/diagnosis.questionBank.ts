import type { DiagnosisAnswerMap, DiagnosisProblemType, DiagnosisQuestion } from './diagnosis.types';

export const diagnosisProblemTypes: Array<{ id: DiagnosisProblemType; label: string; description: string }> = [
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
  巡检: [
    { id: 'breathing', question: '鱼的呼吸看起来正常吗？', options: ['正常', '浮头喘气', '呼吸明显急促', '不确定'] },
    { id: 'waterLook', question: '水看起来怎么样？', options: ['清澈', '发白', '发绿', '有异味', '水面油膜', '不确定'] },
    { id: 'recentAction', question: '最近 48 小时做过什么？', options: ['没有特别操作', '换水', '喂多了', '新鱼入缸', '加药', '不确定'] },
    { id: 'behavior', question: '鱼的行为怎么样？', options: ['正常游动', '趴底不动', '不吃食', '躲藏', '追咬打架', '不确定'] },
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
