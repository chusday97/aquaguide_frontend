import type { RawVisionCandidate } from '../../packages/contracts/src/index';
import type { Fish } from '../types';

export type MappedRecognitionCandidate = RawVisionCandidate & {
  fish?: Fish;
  matchType: 'exact' | 'alias' | 'fuzzy' | 'none';
};

export const normalizeSpeciesName = (value = '') => value.toLowerCase().replace(/[()（）·\s_-]/g, '');

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
