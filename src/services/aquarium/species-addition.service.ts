import type { Aquarium, Fish } from '../../types';
import {
  evaluateTankCompatibility,
  getTankCompatibilityAddPolicy,
  type TankCompatibilityAddPolicy,
  type TankCompatibilityResult,
  type TankCompatibilityRule,
  type TankCompatibilityStatus,
} from '../../lib/tankCompatibilityEngine';

export type SpeciesAdditionItem = {
  fishId: string;
  quantity: number;
  entryDate?: string;
};

export type SpeciesAdditionEvaluation = {
  fish: Fish;
  quantity: number;
  result: TankCompatibilityResult;
};

export type SpeciesAdditionReview = {
  status: TankCompatibilityStatus;
  policy: TankCompatibilityAddPolicy;
  items: SpeciesAdditionItem[];
  evaluations: SpeciesAdditionEvaluation[];
  keyRules: TankCompatibilityRule[];
};

type ReviewSpeciesAdditionsInput = {
  aquarium: Aquarium;
  items: SpeciesAdditionItem[];
  speciesCatalog: Fish[];
};

type ExecuteSpeciesAdditionInput = ReviewSpeciesAdditionsInput & {
  aquariums: Aquarium[];
  confirmedCaution?: boolean;
  now?: string;
};

export type SpeciesAdditionExecution = {
  added: boolean;
  review: SpeciesAdditionReview | null;
  aquariums: Aquarium[];
  reason?: 'no_valid_species' | 'confirmation_required' | 'missing_information' | 'blocked';
};

const statusRank: Record<TankCompatibilityStatus, number> = {
  compatible: 0,
  caution: 1,
  insufficient_data: 2,
  not_recommended: 3,
};

const normalizeItems = (items: SpeciesAdditionItem[], speciesCatalog: Fish[]) => {
  const knownIds = new Set(speciesCatalog.map(fish => fish.id));
  const grouped = new Map<string, SpeciesAdditionItem>();

  items.forEach(item => {
    if (!knownIds.has(item.fishId)) return;
    const quantity = Math.max(1, Math.round(Number(item.quantity) || 1));
    const existing = grouped.get(item.fishId);
    grouped.set(item.fishId, {
      fishId: item.fishId,
      quantity: (existing?.quantity || 0) + quantity,
      entryDate: item.entryDate || existing?.entryDate,
    });
  });

  return Array.from(grouped.values());
};

const getRulesForStatus = (evaluation: SpeciesAdditionEvaluation) => {
  if (evaluation.result.status === 'not_recommended') return evaluation.result.blockingRules;
  if (evaluation.result.status === 'insufficient_data') return evaluation.result.missingData;
  if (evaluation.result.status === 'caution') {
    return [...evaluation.result.warningRules, ...evaluation.result.missingData];
  }
  return [];
};

export const reviewSpeciesAdditions = ({
  aquarium,
  items,
  speciesCatalog,
}: ReviewSpeciesAdditionsInput): SpeciesAdditionReview | null => {
  const normalizedItems = normalizeItems(items, speciesCatalog);
  if (normalizedItems.length === 0) return null;

  const catalogById = new Map(speciesCatalog.map(fish => [fish.id, fish]));
  const existingFromTank = aquarium.fishes.flatMap(record => {
    const species = catalogById.get(record.fishId);
    return species ? [{ species, record: { quantity: Math.max(1, record.quantity || 1) } }] : [];
  });

  const evaluations = normalizedItems.flatMap(item => {
    const fish = catalogById.get(item.fishId);
    if (!fish) return [];
    const otherAdditions = normalizedItems.flatMap(other => {
      if (other.fishId === item.fishId) return [];
      const species = catalogById.get(other.fishId);
      return species ? [{ species, record: { quantity: other.quantity } }] : [];
    });
    return [{
      fish,
      quantity: item.quantity,
      result: evaluateTankCompatibility({
        tank: aquarium,
        existingSpecies: [...existingFromTank, ...otherAdditions],
        candidateSpecies: fish,
        candidateQuantity: item.quantity,
      }),
    }];
  });

  if (evaluations.length === 0) return null;
  const status = evaluations.reduce<TankCompatibilityStatus>((current, evaluation) => (
    statusRank[evaluation.result.status] > statusRank[current] ? evaluation.result.status : current
  ), 'compatible');
  const keyRules = evaluations
    .flatMap(getRulesForStatus)
    .filter((rule, index, rules) => rules.findIndex(candidate => (
      `${candidate.code}-${candidate.title}-${candidate.evidence}` === `${rule.code}-${rule.title}-${rule.evidence}`
    )) === index)
    .slice(0, 4);

  return {
    status,
    policy: getTankCompatibilityAddPolicy(status),
    items: normalizedItems,
    evaluations,
    keyRules,
  };
};

export const executeSpeciesAddition = ({
  aquariums,
  aquarium,
  items,
  speciesCatalog,
  confirmedCaution = false,
  now = new Date().toISOString(),
}: ExecuteSpeciesAdditionInput): SpeciesAdditionExecution => {
  const review = reviewSpeciesAdditions({ aquarium, items, speciesCatalog });
  if (!review) return { added: false, review, aquariums, reason: 'no_valid_species' };
  if (review.policy === 'block') return { added: false, review, aquariums, reason: 'blocked' };
  if (review.policy === 'complete_information') {
    return { added: false, review, aquariums, reason: 'missing_information' };
  }
  if (review.policy === 'confirm' && !confirmedCaution) {
    return { added: false, review, aquariums, reason: 'confirmation_required' };
  }

  const updatedAquariums = aquariums.map(item => {
    if (item.id !== aquarium.id) return item;
    const nextFishes = [...item.fishes];
    review.items.forEach(addition => {
      const existingIndex = nextFishes.findIndex(record => record.fishId === addition.fishId);
      if (existingIndex >= 0) {
        nextFishes[existingIndex] = {
          ...nextFishes[existingIndex],
          quantity: Math.max(1, nextFishes[existingIndex].quantity || 1) + addition.quantity,
        };
        return;
      }
      const entryDate = addition.entryDate ? new Date(addition.entryDate).toISOString() : now;
      nextFishes.push({
        id: Math.random().toString(36).substring(2, 9),
        fishId: addition.fishId,
        quantity: addition.quantity,
        entryDate,
        lastWaterChangeDate: entryDate,
      });
    });
    return { ...item, fishes: nextFishes };
  });

  return { added: true, review, aquariums: updatedAquariums };
};
