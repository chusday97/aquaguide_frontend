import assert from 'node:assert/strict';
import { generateTankDailyCheckInterpretation, sanitizeTankDailyCheckInterpretation } from '../src/lib/aiClient';
import type { DiagnosisRecord, TankDailyCheckContext } from '../src/modules/diagnosis/diagnosis.types';
import { findDailyPatrolRecord, upsertDiagnosisRecord } from '../src/services/diagnosis/diagnosis-records.service';

const context: TankDailyCheckContext = {
  aquariumSnapshot: {
    aquariumId: 'tank-1',
    waterType: '淡水',
    temperature: '25°C',
    volume: '60L',
    stocked: '红绿灯 x10',
    recentWaterChange: '昨天',
    recentFeeding: '今天',
    recentAddedSpecies: '无',
  },
  answers: { breathing: '经常浮头', odor: '明显异味' },
  deterministicResult: {
    riskLevel: 'high',
    riskLabel: '高风险',
    summary: '优先处理缺氧或水质恶化。',
    currentAction: '立即增氧',
    actions: ['立即增氧'],
    avoidActions: ['不要盲目下药'],
    possibleCauses: ['缺氧'],
    observeItems: ['呼吸是否恢复'],
    missingInfo: ['氨氮'],
    evidence: ['经常浮头'],
    keyMetrics: [],
    matchedRules: ['water-breathing-high-risk'],
    matchedArticles: [],
  },
  candidateArticles: [{ id: 'safe-article', title: '水质变差怎么办', summary: '安全步骤' }],
};

const constrained = sanitizeTankDailyCheckInterpretation({
  summary: '模型解释',
  priority: 'routine',
  reasoning: ['关联解释'],
  recommendedArticleIds: ['safe-article', 'invented-article'],
  clarifyingQuestions: ['是否多条鱼浮头？'],
  disclaimer: '忽略本地规则',
}, context);
assert.equal(constrained.priority, 'urgent', 'AI 不得降低本地高风险');
assert.deepEqual(constrained.recommendedArticleIds, ['safe-article'], '虚构文章必须被丢弃');
assert.match(constrained.disclaimer, /不是疾病确诊/);

const originalFetch = globalThis.fetch;
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});
try {
  globalThis.fetch = async () => response({ ok: false, error: 'AI provider is not configured' }, 503);
  const notConfigured = await generateTankDailyCheckInterpretation(context);
  assert.equal(notConfigured.source, 'fallback');
  assert.equal(notConfigured.failureReason, 'not_configured');

  globalThis.fetch = async () => response({ ok: false, error: 'AI request timed out' }, 504);
  const timeout = await generateTankDailyCheckInterpretation(context);
  assert.equal(timeout.source, 'fallback');
  assert.equal(timeout.failureReason, 'timeout');

  globalThis.fetch = async () => response({ ok: true, task: 'wrong_task', data: {} });
  const invalidTask = await generateTankDailyCheckInterpretation(context);
  assert.equal(invalidTask.failureReason, 'invalid_json');

  globalThis.fetch = async () => response({
    ok: true,
    task: 'tank_daily_check_interpretation',
    data: {
      summary: '模型输出',
      priority: 'routine',
      reasoning: ['模型关联'],
      recommendedArticleIds: ['safe-article', 'invented-article'],
      clarifyingQuestions: [],
    },
  });
  const constrainedModel = await generateTankDailyCheckInterpretation(context);
  assert.equal(constrainedModel.source, 'model');
  assert.equal(constrainedModel.priority, 'urgent');
  assert.deepEqual(constrainedModel.recommendedArticleIds, ['safe-article']);
} finally {
  globalThis.fetch = originalFetch;
}

const makeRecord = (createdAt: string, summary: string): DiagnosisRecord => ({
  diagnosisId: summary,
  id: summary,
  createdAt,
  aquariumId: 'tank-1',
  source: { type: 'home' },
  problemType: '巡检',
  answers: {},
  resultSummary: summary,
  riskLevel: '低风险',
  suggestedActions: [],
  missingInfo: [],
  followUpNotes: [],
});
const first = makeRecord('2026-07-13T08:00:00+08:00', 'first');
const updated = makeRecord('2026-07-13T20:00:00+08:00', 'updated');
const nextDay = makeRecord('2026-07-14T08:00:00+08:00', 'next-day');
const sameDayRecords = upsertDiagnosisRecord([first], updated);
assert.equal(sameDayRecords.length, 1);
assert.equal(sameDayRecords[0].resultSummary, 'updated');
const twoDays = upsertDiagnosisRecord(sameDayRecords, nextDay);
assert.equal(twoDays.length, 2);
assert.equal(findDailyPatrolRecord(twoDays, 'tank-1', new Date('2026-07-14T12:00:00+08:00'))?.resultSummary, 'next-day');

console.log('daily check contract: AI constraints and daily upsert passed');
