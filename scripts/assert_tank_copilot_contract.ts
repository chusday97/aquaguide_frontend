import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Aquarium } from '../src/types';
import type { SmartRecommendationOutput } from '../src/modules/recommendation/recommendation.schema';
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

const aquariumPage = fs.readFileSync(path.join(process.cwd(), 'src/pages/Aquarium.tsx'), 'utf8');
for (const legacyField of ['tankCopilotResult.reply', 'tankCopilotResult.safeCandidates', 'tankCopilotResult.nextAction']) {
  assert.equal(aquariumPage.includes(legacyField), false, `页面不得继续读取旧 Copilot 字段：${legacyField}`);
}

console.log('Tank Copilot contract assertions passed');
