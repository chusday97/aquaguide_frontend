import assert from 'node:assert/strict';
import { generateTankBuildCopilot } from '../src/lib/aiClient';
import {
  buildLocalTankCopilotFallback,
  sanitizeTankCopilotResponse,
  type CopilotResponseCore,
} from '../src/modules/copilot/copilot.policy';
import type {
  CandidateSummary,
  CopilotQuestion,
  TankCopilotAction,
  TankCopilotContext,
} from '../src/modules/copilot/copilot.types';

type EvaluationScenario = {
  name: string;
  run: () => Promise<void> | void;
};

const candidate = (speciesId: string, status: CandidateSummary['status'] = 'compatible'): CandidateSummary => ({
  speciesId,
  name: speciesId,
  status,
  recommendedQuantity: 3,
  reason: '本地规则候选。',
});

const makeContext = (overrides: Partial<TankCopilotContext> = {}): TankCopilotContext => ({
  goal: '新手淡水小缸',
  answers: {},
  aquariumSummary: {
    id: 'tank-eval',
    name: '评测鱼缸',
    waterType: 'Freshwater',
    volumeLiters: 30,
    sizeCm: { length: '40', width: '25', height: '30' },
    targetTemperature: '25',
    equipment: { filter: '瀑布过滤', heater: true, oxygen: false, light: '普通灯' },
    livestockCount: 0,
    livestock: [],
  },
  missingInformation: [],
  safeCandidates: [candidate('safe-1')],
  adjustableCandidates: [candidate('adjustable-1', 'caution')],
  blockedReasons: [],
  ruleVersion: 'tank-compatibility-v1',
  ...overrides,
});

const modelCore = (overrides: Partial<CopilotResponseCore> = {}): CopilotResponseCore => ({
  goalUnderstanding: '模型理解了建缸目标。',
  missingQuestions: [],
  planSummary: '先查看本地规则候选，再进入模拟添加。',
  recommendedActions: [{ type: 'view_safe_candidates', label: '任意模型文案' }],
  selectedCandidateIds: ['safe-1'],
  blockedExplanation: [],
  ...overrides,
});

const modelResponse = (data: Record<string, unknown>, status = 200) => new Response(JSON.stringify({
  ok: status < 400,
  task: 'build_tank_copilot',
  data,
}), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

const withMockFetch = async (
  mock: typeof fetch,
  action: () => Promise<void>,
) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mock;
  try {
    await action();
  } finally {
    globalThis.fetch = originalFetch;
  }
};

const scenarios: EvaluationScenario[] = [
  {
    name: '01 新手 20L 淡水缸缺少过滤时先完善信息',
    run: () => {
      const result = buildLocalTankCopilotFallback(makeContext({ missingInformation: ['缺少过滤设备'] }));
      assert.equal(result.recommendedActions[0]?.type, 'complete_tank_info');
      assert.equal(result.missingQuestions[0]?.informationKey, 'filter');
    },
  },
  {
    name: '02 30L 虾缸信息完整时查看本地候选',
    run: () => {
      const result = buildLocalTankCopilotFallback(makeContext({ goal: '30L 虾缸' }));
      assert.equal(result.recommendedActions[0]?.type, 'view_safe_candidates');
    },
  },
  {
    name: '03 60L 低维护草缸保留安全与可调整候选',
    run: () => {
      const result = buildLocalTankCopilotFallback(makeContext({ goal: '60L 低维护草缸' }));
      assert.deepEqual(result.selectedCandidateIds, ['safe-1', 'adjustable-1']);
    },
  },
  {
    name: '04 空缸缺少水体类型时只追问已识别缺失项',
    run: () => {
      const result = buildLocalTankCopilotFallback(makeContext({ missingInformation: ['缺少水体类型'] }));
      assert.deepEqual(result.missingQuestions.map(item => item.informationKey), ['water_type']);
    },
  },
  {
    name: '05 已有领地鱼时保留本地阻断原因',
    run: () => {
      const result = buildLocalTankCopilotFallback(makeContext({ blockedReasons: ['已有领地鱼，排除同层强领地候选。'] }));
      assert.deepEqual(result.blockedExplanation, ['已有领地鱼，排除同层强领地候选。']);
    },
  },
  {
    name: '06 已有捕食者时模型不能加回阻断物种',
    run: () => {
      const result = sanitizeTankCopilotResponse(modelCore({ selectedCandidateIds: ['blocked-predation'] }), makeContext({
        safeCandidates: [],
        adjustableCandidates: [],
        blockedReasons: ['捕食风险'],
      }));
      assert.deepEqual(result.selectedCandidateIds, []);
      assert.equal(result.recommendedActions[0]?.type, 'restart_goal');
    },
  },
  {
    name: '07 海水目标与淡水鱼缸冲突时没有可执行候选',
    run: () => {
      const result = buildLocalTankCopilotFallback(makeContext({
        goal: '海水珊瑚缸',
        safeCandidates: [],
        adjustableCandidates: [],
        blockedReasons: ['当前鱼缸为淡水，水体类型冲突。'],
      }));
      assert.equal(result.recommendedActions[0]?.type, 'restart_goal');
    },
  },
  {
    name: '08 容量不足时不生成模拟添加动作',
    run: () => {
      const result = sanitizeTankCopilotResponse(modelCore({
        recommendedActions: [{ type: 'start_addition_simulation', label: '模拟' }],
        selectedCandidateIds: ['too-large'],
      }), makeContext({ safeCandidates: [], adjustableCandidates: [] }));
      assert.equal(result.recommendedActions[0]?.type, 'restart_goal');
    },
  },
  {
    name: '09 温度无交集候选不能进入方案',
    run: () => {
      const result = sanitizeTankCopilotResponse(modelCore({ selectedCandidateIds: ['temperature-blocked'] }), makeContext());
      assert.deepEqual(result.selectedCandidateIds, []);
    },
  },
  {
    name: '10 本地数据库之外的物种 ID 被删除',
    run: () => {
      const result = sanitizeTankCopilotResponse(modelCore({ selectedCandidateIds: ['invented-species'] }), makeContext());
      assert.deepEqual(result.selectedCandidateIds, []);
    },
  },
  {
    name: '11 模型返回阻断物种时只保留安全候选',
    run: () => {
      const result = sanitizeTankCopilotResponse(modelCore({ selectedCandidateIds: ['safe-1', 'blocked-1'] }), makeContext());
      assert.deepEqual(result.selectedCandidateIds, ['safe-1']);
    },
  },
  {
    name: '12 AI 未配置时返回本地模板与明确原因',
    run: () => withMockFetch(async () => new Response(JSON.stringify({ ok: false, error: 'AI provider not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    }), async () => {
      const result = await generateTankBuildCopilot(makeContext());
      assert.equal(result.source, 'fallback');
      assert.equal(result.failureReason, 'not_configured');
    }),
  },
  {
    name: '13 网络失败时本地规则仍返回下一步',
    run: () => withMockFetch(async () => { throw new TypeError('Failed to fetch'); }, async () => {
      const result = await generateTankBuildCopilot(makeContext());
      assert.equal(result.source, 'fallback');
      assert.equal(result.failureReason, 'network');
      assert.equal(result.recommendedActions[0]?.type, 'view_safe_candidates');
    }),
  },
  {
    name: '14 请求超时时标记 timeout 并保留 fallback',
    run: () => withMockFetch(async () => { throw new DOMException('Timed out', 'AbortError'); }, async () => {
      const result = await generateTankBuildCopilot(makeContext());
      assert.equal(result.source, 'fallback');
      assert.equal(result.failureReason, 'timeout');
    }),
  },
  {
    name: '15 非法 JSON 时不阻塞本地方案',
    run: () => withMockFetch(async () => new Response('not-json', { status: 200 }), async () => {
      const result = await generateTankBuildCopilot(makeContext());
      assert.equal(result.source, 'fallback');
      assert.equal(result.failureReason, 'invalid_json');
    }),
  },
  {
    name: '16 未知 action 被删除并替换为真实动作',
    run: () => withMockFetch(async () => modelResponse({
      ...modelCore(),
      recommendedActions: [{ type: 'delete_tank', label: '删除鱼缸' }],
    }), async () => {
      const result = await generateTankBuildCopilot(makeContext());
      assert.deepEqual(result.recommendedActions, [{ type: 'view_safe_candidates', label: '查看候选生物' }]);
    }),
  },
  {
    name: '17 重复动作会去重且标签由本地固定',
    run: () => {
      const actions: TankCopilotAction[] = [
        { type: 'view_safe_candidates', label: '模型标签一' },
        { type: 'view_safe_candidates', label: '模型标签二' },
      ];
      const result = sanitizeTankCopilotResponse(modelCore({ recommendedActions: actions }), makeContext());
      assert.deepEqual(result.recommendedActions, [{ type: 'view_safe_candidates', label: '查看候选生物' }]);
    },
  },
  {
    name: '18 追问最多 3 个且不重复询问已有信息',
    run: () => {
      const questions: CopilotQuestion[] = [
        { id: 'size', prompt: '尺寸？', informationKey: 'tank_size' },
        { id: 'water', prompt: '水体？', informationKey: 'water_type' },
        { id: 'temp', prompt: '温度？', informationKey: 'temperature' },
        { id: 'filter', prompt: '过滤？', informationKey: 'filter' },
        { id: 'filter-duplicate', prompt: '过滤设备？', informationKey: 'filter' },
      ];
      const context = makeContext({ missingInformation: ['缺少鱼缸容量', '缺少水体类型', '缺少温度', '缺少过滤设备'] });
      const result = sanitizeTankCopilotResponse(modelCore({ missingQuestions: questions }), context);
      assert.equal(result.missingQuestions.length, 3);
      assert.equal(new Set(result.missingQuestions.map(item => item.informationKey)).size, 3);
    },
  },
  {
    name: '19 模型候选超过 6 个时限制输出数量',
    run: () => {
      const ids = Array.from({ length: 8 }, (_, index) => `safe-${index + 1}`);
      const result = sanitizeTankCopilotResponse(modelCore({ selectedCandidateIds: ids }), makeContext({
        safeCandidates: ids.map(id => candidate(id)),
        adjustableCandidates: [],
      }));
      assert.equal(result.selectedCandidateIds.length, 6);
    },
  },
  {
    name: '20 合法模型回复保留 model 来源并通过本地过滤',
    run: () => withMockFetch(async () => modelResponse(modelCore({
      recommendedActions: [{ type: 'start_addition_simulation', label: '直接添加' }],
      selectedCandidateIds: ['safe-1'],
    })), async () => {
      const result = await generateTankBuildCopilot(makeContext());
      assert.equal(result.source, 'model');
      assert.deepEqual(result.selectedCandidateIds, ['safe-1']);
      assert.deepEqual(result.recommendedActions, [{ type: 'start_addition_simulation', label: '进入模拟添加' }]);
    }),
  },
];

const durations: number[] = [];
for (const scenario of scenarios) {
  const startedAt = performance.now();
  await scenario.run();
  durations.push(performance.now() - startedAt);
  console.log(`PASS ${scenario.name}`);
}

const sortedDurations = [...durations].sort((a, b) => a - b);
const p95Index = Math.max(0, Math.ceil(sortedDurations.length * 0.95) - 1);
console.log(JSON.stringify({
  scenarios: scenarios.length,
  passed: scenarios.length,
  passRate: 1,
  p95Ms: Number(sortedDurations[p95Index].toFixed(2)),
}, null, 2));
