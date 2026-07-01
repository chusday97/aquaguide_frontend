import type { Fish } from '../../types';
import type { TankCompatibilityResult, TankCompatibilityRule, TankCompatibilityStatus } from '../../lib/tankCompatibilityEngine';

export type KnowledgeConfidence = 'verified' | 'derived' | 'unknown';

export type KnowledgeSource = {
  type: 'species_data' | 'rule_engine' | 'local_graph' | 'unknown';
  label: string;
  confidence: KnowledgeConfidence;
};

export type SpeciesKnowledgeProfile = {
  speciesId: string;
  displayName: string;
  scientificName: string;
  category: string;
  topTags: string[];
  facts: {
    waterType: 'freshwater' | 'saltwater' | 'brackish' | 'unknown';
    temperatureRange?: { min: number; max: number };
    phRange?: { min: number; max: number };
    minVolumeLiters?: number;
    temperament: Fish['temperament'] | 'unknown';
    housingMode: Fish['housingMode'] | 'unknown';
    difficulty: Fish['difficulty'] | 'unknown';
  };
  knowledge: {
    sexIdentification: {
      title: string;
      summary: string;
      points: string[];
      confidence: KnowledgeConfidence;
      source: KnowledgeSource;
    };
  };
  source: KnowledgeSource;
};

export type CompatibilityRiskType =
  | 'water_type'
  | 'temperature'
  | 'ph'
  | 'space'
  | 'predation'
  | 'aggression'
  | 'territory'
  | 'bioload'
  | 'group_size'
  | 'equipment'
  | 'unknown';

export type CompatibilityRelationship = {
  relationship: 'compatible' | 'conditional' | 'not_recommended' | 'unknown';
  riskType: CompatibilityRiskType;
  title: string;
  evidence: string;
  severity: 'none' | 'low' | 'medium' | 'high' | 'unknown';
  conditions: string[];
  mitigation: string[];
  sourceRule: TankCompatibilityRule;
};

export type PairCompatibilityResult = {
  pairId: string;
  speciesA: Fish;
  speciesB: Fish;
  quantityA: number;
  quantityB: number;
  status: TankCompatibilityStatus;
  primaryReason?: CompatibilityRelationship;
  secondaryReasons: CompatibilityRelationship[];
  passedRelationships: CompatibilityRelationship[];
  rawResult: TankCompatibilityResult;
  adjustable: boolean;
  actions: string[];
};

export type CompatibilityDecision = {
  status: TankCompatibilityStatus;
  riskLevel: TankCompatibilityResult['riskLevel'];
  summary: string;
  pairResults: PairCompatibilityResult[];
  primaryConflict?: PairCompatibilityResult;
  blockedReasons: CompatibilityRelationship[];
  adjustableReasons: CompatibilityRelationship[];
  missingInformation: CompatibilityRelationship[];
  passedRules: TankCompatibilityRule[];
  warningRules: TankCompatibilityRule[];
  blockingRules: TankCompatibilityRule[];
  missingData: TankCompatibilityRule[];
  suggestions: string[];
  aggregateResult: TankCompatibilityResult;
  metadata: TankCompatibilityResult['metadata'];
};

export type DiagnosisNode = {
  id: string;
  question: string;
  options: Array<{
    id: string;
    label: string;
    nextNodeId?: string;
    resultId?: string;
  }>;
};

export type DiagnosisResultNode = {
  id: string;
  title: string;
  summary: string;
  severity: 'info' | 'caution' | 'urgent';
  actions: string[];
};
