import type { Aquarium } from '../../types';

export type CopilotStep = 'goal' | 'clarification' | 'plan';

export type CopilotQuestion = {
  id: string;
  prompt: string;
  informationKey: 'tank_size' | 'water_type' | 'temperature' | 'filter' | 'preference' | 'other';
};

export type TankContextSummary = {
  id: string;
  name: string;
  waterType?: Aquarium['waterType'];
  volumeLiters: number;
  sizeCm: {
    length: string | null;
    width: string | null;
    height: string | null;
  };
  targetTemperature?: string;
  equipment?: Aquarium['equipment'];
  livestockCount: number;
  livestock: Array<{
    fishId: string;
    quantity: number;
    entryDate: string;
  }>;
};

export type CandidateSummary = {
  speciesId: string;
  name: string;
  status: 'compatible' | 'caution' | 'insufficient_data';
  recommendedQuantity: number;
  reason: string;
  risks?: string[];
  requiredAdjustments?: string[];
};

export type TankCopilotContext = {
  goal: string;
  answers: Record<string, string>;
  aquariumSummary: TankContextSummary;
  missingInformation: string[];
  safeCandidates: CandidateSummary[];
  adjustableCandidates: CandidateSummary[];
  blockedReasons: string[];
  ruleVersion: string;
};

export type TankCopilotActionType =
  | 'complete_tank_info'
  | 'view_safe_candidates'
  | 'start_addition_simulation'
  | 'restart_goal';

export type TankCopilotAction = {
  type: TankCopilotActionType;
  label: string;
};

export type TankCopilotResponse = {
  goalUnderstanding: string;
  missingQuestions: CopilotQuestion[];
  planSummary?: string;
  recommendedActions: TankCopilotAction[];
  selectedCandidateIds: string[];
  blockedExplanation: string[];
  source: 'model' | 'fallback';
  generatedAt: string;
  failureReason?: 'not_configured' | 'network' | 'timeout' | 'invalid_json' | 'status_mismatch' | 'unknown';
  task: 'build_tank_copilot';
};

export type CopilotPlan = Pick<TankCopilotResponse, 'goalUnderstanding' | 'planSummary' | 'recommendedActions' | 'selectedCandidateIds' | 'blockedExplanation'>;

export type CopilotSession = {
  goal: string;
  step: CopilotStep;
  questions: CopilotQuestion[];
  answers: Record<string, string>;
  tankContext: TankContextSummary;
  missingInformation: string[];
  safeCandidateIds: string[];
  adjustableCandidateIds: string[];
  blockedReasons: string[];
  plan?: CopilotPlan;
};

export type TankCopilotRequest = {
  task: 'build_tank_copilot';
  context: TankCopilotContext;
};
