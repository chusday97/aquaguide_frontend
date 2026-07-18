import type { RawVisionCandidate } from '../../packages/contracts/src/index';
import type { Aquarium, Fish } from '../types';

export type MappedRecognitionCandidate = RawVisionCandidate & {
  fish?: Fish;
  matchType: 'exact' | 'alias' | 'fuzzy' | 'none';
};

export const normalizeSpeciesName = (value = '') => value.toLowerCase().replace(/[()（）·\s_-]/g, '');

const diagnosableFishCategories = new Set(['鱼类', '灯科鱼', '慈鲷/斗鱼', '海水鱼', '鲶鱼/异型']);

export const isSpeciesEligibleForHealthTriage = (fish: Fish) => diagnosableFishCategories.has(fish.category);

const parseNumericRange = (value: string) => {
  const numbers = value.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  return numbers.length >= 2 ? { min: numbers[0], max: numbers[1] } : null;
};

export const buildSpeciesDiagnosisContextAnswers = (fish: Fish, aquarium?: Aquarium | null) => {
  const answers: Record<string, string> = {};
  const isSaltwaterSpecies = fish.category === '海水鱼';
  answers.water_fit = !aquarium?.waterType
    ? 'unknown'
    : (aquarium.waterType === 'Saltwater') === isSaltwaterSpecies ? 'match' : 'mismatch';
  const temperature = Number(aquarium?.targetTemperature);
  const temperatureRange = parseNumericRange(fish.waterTemperature);
  answers.temperature_fit = Number.isFinite(temperature) && temperatureRange
    ? temperature >= temperatureRange.min && temperature <= temperatureRange.max ? 'within' : 'outside'
    : 'unknown';
  const liters = aquarium?.dimensions
    ? Number(aquarium.dimensions.length) * Number(aquarium.dimensions.width) * Number(aquarium.dimensions.height) * 0.85 / 1000
    : 0;
  const minimumLiters = Number(fish.tankSize.match(/\d+(?:\.\d+)?/)?.[0]);
  answers.space_fit = liters > 0 && Number.isFinite(minimumLiters)
    ? liters >= minimumLiters ? 'sufficient' : 'insufficient'
    : 'unknown';
  answers.filter_status = !aquarium?.equipment ? 'unknown' : aquarium.equipment.filter && aquarium.equipment.filter !== '无' ? 'present' : 'missing';
  answers.oxygen_status = !aquarium?.equipment ? 'unknown' : aquarium.equipment.oxygen ? 'present' : 'missing';
  answers.recent_added = !aquarium ? 'unknown' : aquarium.fishes.some(item => {
    const enteredAt = new Date(item.entryDate).getTime();
    return Number.isFinite(enteredAt) && Date.now() - enteredAt <= 7 * 86_400_000;
  }) ? 'yes' : 'no';
  const waterChangeAt = aquarium?.lastWaterChangeDate ? new Date(aquarium.lastWaterChangeDate).getTime() : Number.NaN;
  answers.recent_water_change = Number.isFinite(waterChangeAt)
    ? Date.now() - waterChangeAt <= 2 * 86_400_000 ? 'recent' : 'not_recent'
    : 'unknown';
  return answers;
};

export const mapVisionCandidateToCatalog = (
  candidate: RawVisionCandidate,
  catalog: Fish[],
): MappedRecognitionCandidate => {
  const scientific = normalizeSpeciesName(candidate.scientificName);
  const common = normalizeSpeciesName(candidate.commonName);
  const scientificMatch = scientific && catalog.find(fish => normalizeSpeciesName(fish.scientificName) === scientific);
  if (scientificMatch) return { ...candidate, fish: scientificMatch, matchType: 'exact' };
  const nameMatch = catalog.find(fish => normalizeSpeciesName(fish.name) === common);
  if (nameMatch) return { ...candidate, fish: nameMatch, matchType: 'exact' };
  const aliasMatch = catalog.find(fish => normalizeSpeciesName((fish as Fish & { _originalName?: string })._originalName) === common);
  if (aliasMatch) return { ...candidate, fish: aliasMatch, matchType: 'alias' };
  const fuzzy = common.length >= 3
    ? catalog.find(fish => normalizeSpeciesName(fish.name).includes(common) || common.includes(normalizeSpeciesName(fish.name)))
    : undefined;
  return { ...candidate, ...(fuzzy ? { fish: fuzzy, matchType: 'fuzzy' as const } : { matchType: 'none' as const }) };
};
