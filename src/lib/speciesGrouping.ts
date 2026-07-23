import i18n from 'i18next';
import type { Fish } from '../types';

export interface SpeciesGroup {
  groupId: string;
  groupName: string;
  baseScientificName: string;
  representativeSpecies: Fish;
  variants: Fish[];
  variantCount: number;
  tags: string[];
}

export type AtlasDisplayItem =
  | { kind: 'species'; fish: Fish }
  | { kind: 'group'; group: SpeciesGroup };

const MANUAL_GROUP_NAMES: Record<string, string> = {
  'poecilia reticulata': '孔雀鱼',
  'amatitlania nigrofasciata': '迷你鹦鹉鱼',
  'carassius auratus': '金鱼',
  'neocaridina davidi': '米虾',
  'ancistrus sp': '黄金胡子',
  'bucephalandra sp': '辣椒榕',
  'tylomelania sp': '兔螺',
  'vesicularia sp': '莫斯',
  'zoanthus sp': '纽扣珊瑚',
  'geophagus sp': '关刀鱼',
};

const MANUAL_GROUP_NAMES_EN: Record<string, string> = {
  'poecilia reticulata': 'Guppy',
  'amatitlania nigrofasciata': 'Mini Parrot Cichlid',
  'carassius auratus': 'Goldfish',
  'neocaridina davidi': 'Dwarf Shrimp',
  'ancistrus sp': 'Ancistrus Pleco',
  'bucephalandra sp': 'Bucephalandra',
  'tylomelania sp': 'Rabbit Snail',
  'vesicularia sp': 'Moss',
  'zoanthus sp': 'Zoanthid Button Coral',
  'geophagus sp': 'Eartheater Cichlid',
};

const PRIORITY_GROUP_REPRESENTATIVES: Record<string, string[]> = {
  'poecilia reticulata': ['孔雀鱼'],
  'amatitlania nigrofasciata': ['迷你鹦鹉鱼'],
  'carassius auratus': ['金鱼'],
  'neocaridina davidi': ['极火虾', '黑壳虾'],
  'ancistrus sp': ['黄金胡子'],
  'bucephalandra sp': ['辣椒榕'],
  'tylomelania sp': ['橙兔螺', '兔螺'],
  'vesicularia sp': ['莫斯'],
};

const normalizeScientificName = (value: string) => (
  value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[()（）]/g, '')
    .trim()
);

export const getBaseScientificName = (scientificName = '') => {
  const normalized = normalizeScientificName(scientificName);
  if (!normalized) return '';
  
  if (/\bsp\.?\b/i.test(normalized)) {
    const parts = normalized.split(/\bsp\.?\b/i);
    const genus = parts[0].trim();
    if (genus) {
      return `${genus} sp`;
    }
  }

  return normalized
    .replace(/\s+(var\.?|sp\.?|cf\.?|aff\.?|forma|f\.)\b.*$/i, '')
    .replace(/\s+["'“”‘’].*$/i, '')
    .replace(/[,\-–—]+\s*$/g, '')
    .trim();
};

const getGroupId = (baseScientificName: string) => (
  `group_${baseScientificName.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '')}`
);

const getRepresentativeSpecies = (baseScientificName: string, variants: Fish[]) => {
  const preferredNames = PRIORITY_GROUP_REPRESENTATIVES[baseScientificName] || [];
  return (
    variants.find(fish => normalizeScientificName(fish.scientificName) === baseScientificName)
    || variants.find(fish => preferredNames.some(name => {
      const currentName = fish.name;
      const originalName = (fish as any)._originalName || fish.name;
      return currentName === name || currentName.includes(name) || originalName === name || originalName.includes(name);
    }))
    || variants[0]
  );
};

const getGroupName = (baseScientificName: string, representative: Fish) => {
  const i18nKey = `encyclopedia.group_${baseScientificName.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '')}`;
  if (i18n.exists(i18nKey)) {
    return i18n.t(i18nKey);
  }
  const isEn = i18n.language === 'en';
  if (isEn) {
    return MANUAL_GROUP_NAMES_EN[baseScientificName] || representative.name.replace(/[（(].*?[）)]/g, '').trim();
  }
  return MANUAL_GROUP_NAMES[baseScientificName] || representative.name.replace(/[（(].*?[）)]/g, '').trim();
};

const getGroupTags = (variants: Fish[], representative: Fish) => {
  const tags = [
    representative.category,
    representative.housingMode,
    representative.difficulty === 'Easy' ? '新手友好' : representative.difficulty === 'Medium' ? '进阶' : '高需求',
  ].filter(Boolean) as string[];
  return Array.from(new Set(tags)).slice(0, 3);
};

export const deriveSpeciesGroups = (fishes: Fish[]): SpeciesGroup[] => {
  const buckets = new Map<string, Fish[]>();

  fishes.forEach(fish => {
    const baseScientificName = getBaseScientificName(fish.scientificName);
    if (!baseScientificName || baseScientificName.split(' ').length < 2) return;
    const bucket = buckets.get(baseScientificName) || [];
    bucket.push(fish);
    buckets.set(baseScientificName, bucket);
  });

  return Array.from(buckets.entries())
    .filter(([, variants]) => variants.length > 1)
    .map(([baseScientificName, variants]) => {
      const representativeSpecies = getRepresentativeSpecies(baseScientificName, variants);
      return {
        groupId: getGroupId(baseScientificName),
        groupName: getGroupName(baseScientificName, representativeSpecies),
        baseScientificName,
        representativeSpecies,
        variants,
        variantCount: variants.length,
        tags: getGroupTags(variants, representativeSpecies),
      };
    });
};

export const buildAtlasDisplayItems = (fishes: Fish[]): AtlasDisplayItem[] => {
  const groups = deriveSpeciesGroups(fishes);
  const groupByFishId = new Map<string, SpeciesGroup>();
  groups.forEach(group => {
    group.variants.forEach(variant => groupByFishId.set(variant.id, group));
  });

  const emittedGroups = new Set<string>();
  const items: AtlasDisplayItem[] = [];

  fishes.forEach(fish => {
    const group = groupByFishId.get(fish.id);
    if (!group) {
      items.push({ kind: 'species', fish });
      return;
    }
    if (emittedGroups.has(group.groupId)) return;
    emittedGroups.add(group.groupId);
    items.push({ kind: 'group', group });
  });

  return items;
};

export const findGroupForSpecies = (speciesId: string, groups: SpeciesGroup[]) => (
  groups.find(group => group.variants.some(variant => variant.id === speciesId)) || null
);

export const getVariantLabel = (fish: Fish, group: SpeciesGroup) => {
  const cleanedGroupName = group.groupName.replace(/[鱼虾螺]$/g, '');
  const withoutGroupName = fish.name
    .replace(group.groupName, '')
    .replace(cleanedGroupName, '')
    .replace(/[（）()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (withoutGroupName) return withoutGroupName;
  if (fish.name === group.groupName) return '标准款';
  return fish.name;
};

export const speciesMatchesKeyword = (fish: Fish, keyword: string) => {
  const q = keyword.trim().toLowerCase();
  if (!q) return false;
  return [
    fish.name,
    fish.scientificName,
    fish.category,
    fish.description,
    (fish as any)._originalName,
    (fish as any)._originalCategory,
    (fish as any)._originalDescription,
  ].some(value => value?.toLowerCase().includes(q));
};
