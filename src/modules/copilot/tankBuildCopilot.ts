import type { Aquarium } from '../../types';
import type { SmartRecommendationOutput } from '../recommendation/recommendation.schema';
import type { TankCopilotContext } from './copilot.types';

const hasText = (value: unknown) => typeof value === 'string' && value.trim().length > 0;

const getTankVolumeLiters = (aquarium: Aquarium) => {
  const length = Number(aquarium.dimensions?.length);
  const width = Number(aquarium.dimensions?.width);
  const height = Number(aquarium.dimensions?.height);
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
  if (!aquarium.equipment?.filter || aquarium.equipment.filter === '无') missing.push('过滤设备');
  return missing;
};

export const buildTankCopilotContext = ({
  aquarium,
  userGoal,
  answers = {},
  smartRecommendation,
}: {
  aquarium: Aquarium;
  userGoal: string;
  answers?: Record<string, string>;
  smartRecommendation: SmartRecommendationOutput;
}): TankCopilotContext => {
  const missingInfo = getTankCopilotMissingInfo(aquarium);
  const livestock = (aquarium.fishes || []).map(item => ({
    fishId: item.fishId,
    quantity: item.quantity || 1,
    entryDate: item.entryDate,
  }));

  return {
    goal: userGoal,
    answers,
    aquariumSummary: {
      id: aquarium.id,
      name: aquarium.name,
      waterType: aquarium.waterType,
      volumeLiters: getTankVolumeLiters(aquarium),
      sizeCm: {
        length: aquarium.dimensions?.length ?? null,
        width: aquarium.dimensions?.width ?? null,
        height: aquarium.dimensions?.height ?? null,
      },
      targetTemperature: aquarium.targetTemperature,
      equipment: aquarium.equipment,
      livestockCount: livestock.reduce((sum, item) => sum + item.quantity, 0),
      livestock,
    },
    missingInformation: missingInfo,
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
    ruleVersion: 'tank-compatibility-v1',
  };
};
