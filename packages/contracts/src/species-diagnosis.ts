import { z } from 'zod';

import { supportedLocaleSchema } from './localization';

const recognitionCatalogKeySchema = z.string().trim().min(1).max(160).regex(/^[\w.-]+$/);

export const recognitionStatusSchema = z.enum(['matched', 'ambiguous', 'unmatched']);
export const confidenceBandSchema = z.enum(['high', 'medium', 'low']);
export const hypothesisLikelihoodSchema = z.enum(['more_likely', 'possible', 'cannot_rule_out']);
export const diagnosisUrgencySchema = z.enum(['routine', 'watch', 'urgent']);

export type RecognitionStatus = z.infer<typeof recognitionStatusSchema>;
export type ConfidenceBand = z.infer<typeof confidenceBandSchema>;
export type HypothesisLikelihood = z.infer<typeof hypothesisLikelihoodSchema>;
export type DiagnosisUrgency = z.infer<typeof diagnosisUrgencySchema>;

export const rawVisionCandidateSchema = z.object({
  commonName: z.string().trim().min(1).max(120),
  scientificName: z.string().trim().min(1).max(160).optional(),
  confidenceBand: confidenceBandSchema,
  visualEvidence: z.array(z.string().trim().min(1).max(240)).max(5),
});

export interface RawVisionCandidate {
  commonName: string;
  scientificName?: string;
  confidenceBand: ConfidenceBand;
  visualEvidence: string[];
}

export const speciesRecognitionResultSchema = z.object({
  recognitionId: z.string().uuid(),
  imageFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  status: recognitionStatusSchema,
  candidates: z.array(rawVisionCandidateSchema.extend({
    catalogKey: recognitionCatalogKeySchema.optional(),
    matchType: z.enum(['exact', 'alias', 'fuzzy', 'none']),
  })).max(3),
  requiresConfirmation: z.literal(true),
  source: z.enum(['model', 'fallback']),
  failureReason: z.enum(['not_configured', 'timeout', 'network', 'invalid_response']).optional(),
  generatedAt: z.string().datetime(),
});

export type SpeciesRecognitionResult = z.infer<typeof speciesRecognitionResultSchema>;

export const symptomObservationSchema = z.object({
  code: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(160),
  source: z.enum(['user_text', 'answer', 'tank', 'species']),
  evidence: z.string().trim().min(1).max(300).optional(),
});

export type SymptomObservation = z.infer<typeof symptomObservationSchema>;

export const diagnosticFollowUpQuestionSchema = z.object({
  id: z.string().trim().min(1).max(80),
  prompt: z.string().trim().min(1).max(240),
  reason: z.string().trim().min(1).max(300),
  options: z.array(z.object({
    id: z.string().trim().min(1).max(80),
    label: z.string().trim().min(1).max(120),
  })).min(2).max(6),
  redFlag: z.boolean(),
});

export type DiagnosticFollowUpQuestion = z.infer<typeof diagnosticFollowUpQuestionSchema>;

export const diagnosisHypothesisSchema = z.object({
  code: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(160),
  likelihood: hypothesisLikelihoodSchema,
  urgency: diagnosisUrgencySchema,
  supportingEvidence: z.array(z.string().trim().min(1).max(300)).max(8),
  contradictingEvidence: z.array(z.string().trim().min(1).max(300)).max(8),
  missingEvidence: z.array(z.string().trim().min(1).max(300)).max(8),
  recommendedActions: z.array(z.string().trim().min(1).max(300)).max(8),
  avoidActions: z.array(z.string().trim().min(1).max(300)).max(8),
  recommendedArticleIds: z.array(recognitionCatalogKeySchema).max(5),
});

export type DiagnosisHypothesis = z.infer<typeof diagnosisHypothesisSchema>;

export const aquariumDiagnosisSnapshotSchema = z.object({
  aquariumId: z.string().trim().min(1).max(160),
  waterType: z.string().trim().max(120),
  temperature: z.string().trim().max(120),
  volume: z.string().trim().max(120),
  stocked: z.string().trim().max(500),
  recentWaterChange: z.string().trim().max(240),
  recentFeeding: z.string().trim().max(240),
  recentAddedSpecies: z.string().trim().max(240),
  dimensions: z.string().trim().max(120).optional(),
  equipment: z.string().trim().max(300).optional(),
  livestockCount: z.number().int().nonnegative().optional(),
  healthScore: z.number().min(0).max(100).optional(),
  riskCount: z.number().int().nonnegative().optional(),
});

export const speciesDiagnosisStepInputSchema = z.object({
  locale: supportedLocaleSchema,
  speciesCatalogKey: recognitionCatalogKeySchema,
  aquariumSnapshot: aquariumDiagnosisSnapshotSchema,
  userDescription: z.string().trim().min(1).max(1000),
  answers: z.record(z.string(), z.string().trim().max(160)),
  askedQuestionIds: z.array(z.string().trim().min(1).max(80)).max(3),
});

export type SpeciesDiagnosisStepInput = z.infer<typeof speciesDiagnosisStepInputSchema>;

export const speciesDiagnosisStepOutputSchema = z.object({
  observations: z.array(symptomObservationSchema).max(24),
  urgency: diagnosisUrgencySchema,
  emergencyActions: z.array(z.string().trim().min(1).max(300)).max(6),
  nextQuestion: diagnosticFollowUpQuestionSchema.optional(),
  hypotheses: z.array(diagnosisHypothesisSchema).max(6),
  complete: z.boolean(),
  disclaimer: z.string().trim().min(1).max(300),
  source: z.enum(['model', 'fallback']),
  failureReason: z.enum(['not_configured', 'network', 'timeout', 'invalid_json', 'status_mismatch', 'unknown']).optional(),
  generatedAt: z.string().datetime(),
});

export type SpeciesDiagnosisStepOutput = z.infer<typeof speciesDiagnosisStepOutputSchema>;

export const recognitionMissInputSchema = z.object({
  imageFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  modelName: z.string().trim().min(1).max(160),
  modelVersion: z.string().trim().min(1).max(160).optional(),
  candidateLabels: z.array(z.string().trim().min(1).max(160)).max(10),
  candidateCatalogKeys: z.array(recognitionCatalogKeySchema).max(10),
});

export const recognitionMissResolveSchema = z.object({
  resolvedCatalogKey: recognitionCatalogKeySchema,
});
