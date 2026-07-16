export type CompatibilityStatus = 'compatible' | 'caution' | 'not_recommended' | 'insufficient_data';
export type DiagnosisRiskCode = 'low' | 'medium' | 'high' | 'unknown';
export type DailyCheckPriority = 'routine' | 'watch' | 'urgent';

const riskRank: Record<DiagnosisRiskCode, number> = {
  unknown: 0,
  low: 1,
  medium: 2,
  high: 3,
};

const priorityRank: Record<DailyCheckPriority, number> = {
  routine: 1,
  watch: 2,
  urgent: 3,
};

export const minimumPriorityForRisk = (risk: DiagnosisRiskCode): DailyCheckPriority => {
  if (risk === 'high') return 'urgent';
  if (risk === 'medium' || risk === 'unknown') return 'watch';
  return 'routine';
};

export const clampAiPriority = (
  deterministicRisk: DiagnosisRiskCode,
  aiPriority: DailyCheckPriority,
): DailyCheckPriority => {
  const minimum = minimumPriorityForRisk(deterministicRisk);
  return priorityRank[aiPriority] < priorityRank[minimum] ? minimum : aiPriority;
};

export const highestRisk = (...risks: DiagnosisRiskCode[]): DiagnosisRiskCode => (
  risks.reduce<DiagnosisRiskCode>((current, candidate) => (
    riskRank[candidate] > riskRank[current] ? candidate : current
  ), 'unknown')
);
