import type { Fish } from '../../types';
import type { SpeciesKnowledgeProfile } from './knowledge.types';

const parseRange = (value?: string) => {
  const matches = value?.match(/(\d+(?:\.\d+)?)/g);
  if (!matches?.length) return undefined;
  const values = matches.map(Number).filter(Number.isFinite);
  if (!values.length) return undefined;
  return { min: Math.min(...values), max: Math.max(...values) };
};

const parseMinLiters = (value?: string) => {
  const range = parseRange(value);
  return range?.min;
};

const getWaterType = (fish: Fish): SpeciesKnowledgeProfile['facts']['waterType'] => {
  const text = `${fish.name} ${fish.scientificName} ${fish.category} ${fish.description}`;
  if (/汽水|brackish/i.test(text)) return 'brackish';
  if (/海水|珊瑚|海葵|水母|marine|coral|anemone|jellyfish/i.test(text)) return 'saltwater';
  if (/淡水|水草|虾|螺|鱼|freshwater/i.test(text)) return 'freshwater';
  return 'unknown';
};

export const buildSpeciesKnowledgeProfile = (fish: Fish): SpeciesKnowledgeProfile => {
  const topTags = [
    fish.category,
    fish.housingMode,
    fish.difficulty === 'Easy' ? '新手友好' : fish.difficulty === 'Hard' ? '困难' : '中等',
  ].filter(Boolean).slice(0, 3) as string[];

  return {
    speciesId: fish.id,
    displayName: fish.name,
    scientificName: fish.scientificName,
    category: fish.category,
    topTags,
    facts: {
      waterType: getWaterType(fish),
      temperatureRange: parseRange(fish.waterTemperature),
      phRange: parseRange(fish.phLevel),
      minVolumeLiters: parseMinLiters(fish.tankSize),
      temperament: fish.temperament || 'unknown',
      housingMode: fish.housingMode || 'unknown',
      difficulty: fish.difficulty || 'unknown',
    },
    knowledge: {
      sexIdentification: {
        title: '暂无可靠的公母辨别资料',
        summary: '当前图鉴没有经过人工审核的公母辨别字段，系统不会仅凭名称或品类猜测公母。',
        points: [
          '可先按健康状态、体型完整度和活性挑选个体。',
          '如果确实需要配对繁殖，建议向可靠商家确认性别来源。',
          '后续补充人工审核资料后，这里会显示具体辨别要点。',
        ],
        confidence: 'unknown',
        source: {
          type: 'unknown',
          label: '缺少结构化公母辨别字段',
          confidence: 'unknown',
        },
      },
    },
    source: {
      type: 'species_data',
      label: '本地图鉴物种字段',
      confidence: 'derived',
    },
  };
};

export const getSpeciesKnowledgeTags = (profile: SpeciesKnowledgeProfile) => profile.topTags.slice(0, 3);
