import type { Fish } from '../../types';

export type CareSourceStatus = 'verified' | 'derived' | 'generic' | 'pending';

export type CarePresentationItem = {
  label: string;
  value: string;
};

export type SpeciesCarePresentation = {
  sourceStatus: CareSourceStatus;
  sourceLabel: string;
  sourceDetail: string;
  feedingItems: CarePresentationItem[];
  environmentItems: CarePresentationItem[];
  hasStructuredProfile: boolean;
};

const clean = (value?: string) => value?.trim() || '';

const getSourcePresentation = (fish: Fish) => {
  const profile = fish.feedingProfile;
  if (!profile) {
    return {
      sourceStatus: 'pending' as const,
      sourceLabel: '资料待核验',
      sourceDetail: '暂无经过复核的物种专属喂养资料。',
    };
  }

  if (profile.needsReview) {
    return {
      sourceStatus: 'pending' as const,
      sourceLabel: '资料待核验',
      sourceDetail: clean(profile.reviewReason) || '当前资料仍在人工复核队列中。',
    };
  }

  const sourceName = clean(profile.sourceName).toLowerCase();
  if (!sourceName || sourceName.includes('fallback') || sourceName.includes('template')) {
    return {
      sourceStatus: 'generic' as const,
      sourceLabel: '通用参考',
      sourceDetail: '当前内容来自类别规则模板，不代表物种专属事实。',
    };
  }

  if (sourceName.includes('manual') || sourceName.includes('verified') || sourceName.includes('reviewed')) {
    return {
      sourceStatus: 'verified' as const,
      sourceLabel: '已核验资料',
      sourceDetail: '当前内容来自人工核验资料。',
    };
  }

  return {
    sourceStatus: 'derived' as const,
    sourceLabel: '资料字段整理',
    sourceDetail: '当前内容由本地资料字段整理，仍应结合个体状态观察。',
  };
};

const pushIfPresent = (items: CarePresentationItem[], label: string, value?: string) => {
  const cleaned = clean(value);
  if (cleaned) items.push({ label, value: cleaned });
};

export const buildSpeciesCarePresentation = (fish: Fish): SpeciesCarePresentation => {
  const profile = fish.feedingProfile;
  const feedingItems: CarePresentationItem[] = [];
  const environmentItems: CarePresentationItem[] = [];

  if (profile) {
    pushIfPresent(feedingItems, '推荐食物', profile.recommendedFoods);
    pushIfPresent(feedingItems, '投喂频率', profile.feedingFrequency);
    pushIfPresent(feedingItems, '单次份量', profile.portionRule);
    pushIfPresent(feedingItems, '投喂水层', profile.feedingLayer);
    pushIfPresent(feedingItems, '避免食物', profile.avoidFoods);
    pushIfPresent(feedingItems, '特别提醒', profile.specialNotes);
  } else {
    pushIfPresent(feedingItems, '基础资料', fish.diet);
  }

  environmentItems.push(
    { label: '换水周期', value: `约 ${fish.waterChangeCycle} 天，根据实际水质稳定调整。` },
    { label: '温度范围', value: fish.waterTemperature },
  );

  return {
    ...getSourcePresentation(fish),
    feedingItems,
    environmentItems,
    hasStructuredProfile: Boolean(profile),
  };
};
