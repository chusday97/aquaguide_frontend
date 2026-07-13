import type { Aquarium } from '../../types';
import type { CareTopic } from '../../data/careTopicsData';

export type DiagnosisProblemType =
  | '巡检'
  | '水质异常'
  | '鱼只异常'
  | '鱼浮头 / 呼吸急促'
  | '拒食'
  | '躲藏不动'
  | '追咬打架'
  | '新鱼入缸'
  | '喂食问题'
  | '怀孕/鱼苗'
  | '死亡处理'
  | '死亡 / 异常死亡'
  | '水质浑浊 / 异味'
  | '虾类死亡'
  | '水草黄叶 / 烂叶'
  | '换水'
  | '设备异常';

export type DiagnosisRiskCode = 'low' | 'medium' | 'high' | 'unknown';

export type DiagnosisQuestion = {
  id: string;
  question: string;
  options: string[];
  optionalText?: boolean;
};

export type DiagnosisAnswerMap = Record<string, string>;

export type AquariumDiagnosisSnapshot = {
  aquariumId: string;
  waterType: string;
  temperature: string;
  volume: string;
  stocked: string;
  recentWaterChange: string;
  recentFeeding: string;
  recentAddedSpecies: string;
  dimensions?: string;
  equipment?: string;
  livestockCount?: number;
  healthScore?: number;
  riskCount?: number;
};

export interface TankDailyCheckContext {
  aquariumSnapshot: AquariumDiagnosisSnapshot;
  answers: DiagnosisAnswerMap;
  userDescription?: string;
  deterministicResult: DiagnosisOutput;
  candidateArticles: Array<{
    id: string;
    title: string;
    summary: string;
  }>;
}

export interface TankDailyCheckInterpretation {
  summary: string;
  priority: 'routine' | 'watch' | 'urgent';
  reasoning: string[];
  recommendedArticleIds: string[];
  clarifyingQuestions: string[];
  disclaimer: string;
}

export type DiagnosisRecord = {
  diagnosisId: string;
  id?: string;
  createdAt: string;
  aquariumId: string;
  source?: { type: 'manual' | 'care_article' | 'home'; title?: string };
  problemType: string;
  answers: DiagnosisAnswerMap;
  structuredAnswers?: Array<{ questionId: string; question: string; answer: string }>;
  resultSummary: string;
  riskLevel: string;
  riskCode?: DiagnosisRiskCode;
  conclusion?: string;
  keyMetrics?: Array<{ label: string; value: string }>;
  suggestedActions: string[];
  avoidActions?: string[];
  observeItems?: string[];
  missingInfo: string[];
  optionalMissingInfo?: string[];
  nextCheckAt?: string;
  followUpNotes: string[];
};

export type DiagnosisRuleResult = {
  ruleId: string;
  riskLevel: DiagnosisRiskCode;
  summary: string;
  actions: string[];
  avoidActions: string[];
  possibleCauses: string[];
  observeItems: string[];
  missingInfo: string[];
  matchedArticleIds: string[];
};

export type DiagnosisOutput = {
  riskLevel: DiagnosisRiskCode;
  riskLabel: string;
  summary: string;
  currentAction: string;
  actions: string[];
  avoidActions: string[];
  possibleCauses: string[];
  observeItems: string[];
  missingInfo: string[];
  evidence: string[];
  keyMetrics: Array<{ label: string; value: string }>;
  matchedRules: string[];
  matchedArticles: Array<{ id: string; title: string; category: string; summary: string }>;
  nextCheckAt?: string;
};

export type AiDiagnosisInput = {
  aquariumSnapshot: AquariumDiagnosisSnapshot;
  problemType: DiagnosisProblemType;
  userAnswers: DiagnosisAnswerMap;
  matchedRules: DiagnosisRuleResult[];
  matchedArticles: CareTopic[];
  previousDiagnosisRecords: unknown[];
};

export type DiagnosisSourceContext = {
  source?: 'home' | 'care_article' | 'species' | 'compatibility';
  title?: string;
  category?: string;
  speciesId?: string;
  selectedSpeciesIds?: string[];
  conflictReasons?: string[];
};

export type BuildDiagnosisInput = {
  aquarium: Aquarium;
  snapshot: AquariumDiagnosisSnapshot;
  problemType: DiagnosisProblemType;
  answers: DiagnosisAnswerMap;
  careTopics: CareTopic[];
  previousDiagnosisRecords?: Array<{ problemType?: string; riskLevel?: string; resultSummary?: string; createdAt?: string }>;
  sourceContext?: DiagnosisSourceContext;
};
