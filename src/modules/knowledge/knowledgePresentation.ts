import type { Fish } from '../../types';
import type { CompatibilityDecision, DiagnosisResultNode, SpeciesKnowledgeProfile } from './knowledge.types';
import { getSpeciesKnowledgeTags } from './speciesKnowledge';

export const buildCompatibilityPresentation = (decision: CompatibilityDecision) => {
  const primaryPair = decision.primaryConflict;
  const primaryReason = primaryPair?.primaryReason;
  return {
    title: decision.status === 'not_recommended'
      ? '不建议加入'
      : decision.status === 'caution'
        ? '谨慎尝试'
        : decision.status === 'insufficient_data'
          ? '信息不足'
          : '当前适合',
    summary: decision.summary,
    primaryPairLabel: primaryPair ? `${primaryPair.speciesA.name} × ${primaryPair.speciesB.name}` : '',
    primaryReason: primaryReason?.evidence || '',
    actions: decision.suggestions.slice(0, 3),
    otherPairs: decision.pairResults
      .filter(pair => pair.pairId !== primaryPair?.pairId)
      .map(pair => ({
        pairId: pair.pairId,
        label: `${pair.speciesA.name} × ${pair.speciesB.name}`,
        status: pair.status,
        reason: pair.primaryReason?.evidence || '未发现主要风险。',
      })),
    evidence: {
      passed: decision.passedRules,
      warnings: decision.warningRules,
      blocked: decision.blockingRules,
      missing: decision.missingData,
    },
  };
};

export const buildSpeciesDetailPresentation = (profile: SpeciesKnowledgeProfile, fish?: Fish) => ({
  title: profile.displayName || fish?.name || '',
  subtitle: profile.scientificName || fish?.scientificName || '',
  tags: getSpeciesKnowledgeTags(profile).slice(0, 3),
  sexIdentification: profile.knowledge.sexIdentification,
});

export const buildDiagnosisPresentation = (result: DiagnosisResultNode, answerPath: string[]) => ({
  title: result.title,
  summary: result.summary,
  severity: result.severity,
  actions: result.actions.slice(0, 3),
  answerPath,
});
