import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Aquarium } from '../src/types';
import type { SmartRecommendationOutput } from '../src/modules/recommendation/recommendation.schema';
import {
  buildLocalTankCopilotFallback,
  sanitizeTankCopilotResponse,
} from '../src/modules/copilot/copilot.policy';
import { buildTankCopilotContext } from '../src/modules/copilot/tankBuildCopilot';

const aquarium: Aquarium = {
  id: 'tank-1',
  name: '测试鱼缸',
  fishes: [{
    id: 'livestock-1',
    fishId: 'species-existing',
    quantity: 3,
    entryDate: '2026-07-01T00:00:00.000Z',
    lastWaterChangeDate: '2026-07-01T00:00:00.000Z',
  }],
  dimensions: { length: '60', width: '40', height: '40' },
  waterType: 'Freshwater',
  targetTemperature: '25',
  equipment: { filter: '瀑布过滤', heater: true, oxygen: false, light: '普通灯' },
};

const recommendation: SmartRecommendationOutput = {
  mode: 'existing_livestock',
  profile: {
    id: aquarium.id,
    name: aquarium.name,
    mode: 'existing_livestock',
    volumeLiters: 96,
    effectiveVolumeLiters: 80,
    lengthCm: 60,
    widthCm: 40,
    heightCm: 40,
    waterType: 'Freshwater',
    temperature: 25,
    equipment: ['瀑布过滤', '加热'],
    substrate: '无',
    plants: [],
    hardscape: [],
    livestock: [],
    load: { currentLoad: 3, capacity: 20, loadRate: 15, status: 'relaxed', remainingCapacity: 17 },
    waterLayers: {},
    missingData: [],
    availableNiches: [],
  },
  direct: [{
    speciesId: 'species-safe',
    name: '安全候选',
    status: 'direct',
    recommendedQuantity: 4,
    fitScore: 90,
    reason: '本地规则通过。',
    risks: [],
    requiredAdjustments: [],
    confidence: 'high',
    loadAfterAdd: 35,
  }],
  adjustable: [{
    speciesId: 'species-adjustable',
    name: '可调整候选',
    status: 'adjustable',
    recommendedQuantity: 2,
    fitScore: 68,
    reason: '补充躲避空间后可考虑。',
    risks: ['空间竞争'],
    requiredAdjustments: ['增加躲避空间'],
    confidence: 'medium',
    loadAfterAdd: 48,
  }],
  blocked: [],
  emptyPlans: [],
  blockedSummary: ['海水生物与当前淡水缸冲突'],
  needsMoreInfo: false,
  infoRequests: [],
  localSummary: '本地规则已完成候选筛选。',
};

const context = buildTankCopilotContext({
  aquarium,
  userGoal: '新手低维护淡水缸',
  answers: { preference: '偏好群游鱼' },
  smartRecommendation: recommendation,
});

assert.equal(context.goal, '新手低维护淡水缸');
assert.deepEqual(context.answers, { preference: '偏好群游鱼' });
assert.equal(context.aquariumSummary.livestockCount, 3);
assert.deepEqual(context.safeCandidates.map(item => item.speciesId), ['species-safe']);
assert.deepEqual(context.adjustableCandidates.map(item => item.speciesId), ['species-adjustable']);
assert.equal('fishData' in context, false, 'Copilot 请求不得包含完整 fishData。');

const sanitized = sanitizeTankCopilotResponse({
  goalUnderstanding: '模型理解结果',
  missingQuestions: [
    { id: 'invented-size', prompt: '请补充尺寸', informationKey: 'tank_size' },
    { id: 'preference', prompt: '偏好什么观赏风格？', informationKey: 'preference' },
  ],
  planSummary: '模型方案',
  recommendedActions: [
    { type: 'complete_tank_info', label: '任意文案' },
    { type: 'start_addition_simulation', label: '任意文案' },
  ],
  selectedCandidateIds: ['species-safe', 'species-outside-local-pool'],
  blockedExplanation: ['本地阻断说明'],
}, context);

assert.deepEqual(sanitized.selectedCandidateIds, ['species-safe'], '模型不得把本地候选池之外的物种加入方案。');
assert.deepEqual(sanitized.missingQuestions.map(item => item.informationKey), ['preference'], '模型不得追问本地未判定为缺失的鱼缸信息。');
assert.deepEqual(sanitized.recommendedActions, [{
  type: 'start_addition_simulation',
  label: '进入模拟添加',
}], '无缺失信息时不得展示完善信息动作，动作标签必须由本地固定。');

const localCandidateFallback = buildLocalTankCopilotFallback(context);
assert.equal(localCandidateFallback.recommendedActions[0]?.type, 'view_safe_candidates');
assert.deepEqual(localCandidateFallback.selectedCandidateIds, ['species-safe', 'species-adjustable']);

const missingInfoFallback = buildLocalTankCopilotFallback({
  ...context,
  missingInformation: ['缺少鱼缸容量', '缺少过滤设备'],
});
assert.equal(missingInfoFallback.recommendedActions[0]?.type, 'complete_tank_info');
assert.deepEqual(
  missingInfoFallback.missingQuestions.map(item => item.informationKey),
  ['tank_size', 'filter'],
);

const aquariumPage = fs.readFileSync(path.join(process.cwd(), 'src/pages/Aquarium.tsx'), 'utf8');
for (const legacyField of ['tankCopilotResult.reply', 'tankCopilotResult.safeCandidates', 'tankCopilotResult.nextAction']) {
  assert.equal(aquariumPage.includes(legacyField), false, `页面不得继续读取旧 Copilot 字段：${legacyField}`);
}

console.log('Tank Copilot contract assertions passed');
