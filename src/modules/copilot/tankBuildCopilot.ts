import type { Aquarium } from '../../types';
import type { SmartRecommendationOutput } from '../recommendation/recommendation.schema';

const hasText = (value: unknown) => typeof value === 'string' && value.trim().length > 0;

const getTankVolumeLiters = (aquarium: Aquarium) => {
  const volume = Number(aquarium.volume);
  if (Number.isFinite(volume) && volume > 0) return Math.round(volume);
  const length = Number(aquarium.length);
  const width = Number(aquarium.width);
  const height = Number(aquarium.height);
  if ([length, width, height].every(value => Number.isFinite(value) && value > 0)) {
    return Math.round((length * width * height) / 1000);
  }
  return 0;
};

export const getTankCopilotMissingInfo = (aquarium: Aquarium) => {
  const missing: string[] = [];
  if (!getTankVolumeLiters(aquarium)) missing.push('鱼缸尺寸或容量');
  if (!hasText(aquarium.waterType)) missing.push('水体类型');
  if (!Number.isFinite(Number(aquarium.targetTemperature))) missing.push('目标水温');
  if (!Number.isFinite(Number(aquarium.ph))) missing.push('pH');
  if (!Number.isFinite(Number(aquarium.hardness))) missing.push('硬度');
  if (!aquarium.equipment?.filter || aquarium.equipment.filter === '无') missing.push('过滤设备');
  return missing;
};

export const buildTankCopilotContext = ({
  aquarium,
  userGoal,
  smartRecommendation,
}: {
  aquarium: Aquarium;
  userGoal: string;
  smartRecommendation: SmartRecommendationOutput;
}) => {
  const missingInfo = getTankCopilotMissingInfo(aquarium);
  const livestock = (aquarium.fishes || []).map(item => ({
    fishId: item.fishId,
    quantity: item.quantity || 1,
    entryDate: item.entryDate,
  }));

  return {
    taskGoal: userGoal,
    aquariumSummary: {
      id: aquarium.id,
      name: aquarium.name,
      waterType: aquarium.waterType,
      volumeLiters: getTankVolumeLiters(aquarium),
      sizeCm: {
        length: aquarium.length,
        width: aquarium.width,
        height: aquarium.height,
      },
      targetTemperature: aquarium.targetTemperature,
      ph: aquarium.ph ?? null,
      hardness: aquarium.hardness ?? null,
      equipment: aquarium.equipment,
      livestockCount: livestock.reduce((sum, item) => sum + item.quantity, 0),
      livestock,
    },
    toolResults: {
      missingInfo,
      localSummary: smartRecommendation.localSummary,
      safeCandidates: smartRecommendation.direct.slice(0, 6).map(item => ({
        speciesId: item.speciesId,
        name: item.name,
        status: 'compatible',
        recommendedQuantity: item.recommendedQuantity,
        reason: item.reason,
        risks: item.risks,
      })),
      adjustableCandidates: smartRecommendation.adjustable.slice(0, 6).map(item => ({
        speciesId: item.speciesId,
        name: item.name,
        status: 'caution',
        recommendedQuantity: item.recommendedQuantity,
        reason: item.reason,
        risks: item.risks,
        requiredAdjustments: item.requiredAdjustments,
      })),
      blockedReasons: smartRecommendation.blockedSummary.slice(0, 8),
    },
    ruleFacts: {
      source: 'AquaGuide local rules',
      ruleEngine: 'evaluateTankCompatibility',
      aiCannotOverrideRuleStatus: true,
      blockedSpeciesMustStayExcluded: true,
      noDirectWriteToAquarium: true,
    },
  };
};
