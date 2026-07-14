import assert from 'node:assert/strict';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const localStorage = new MemoryStorage();
const eventTarget = new EventTarget();
const fakeWindow = Object.assign(eventTarget, { localStorage, setTimeout, clearTimeout });
Object.defineProperty(globalThis, 'window', { value: fakeWindow, configurable: true });
Object.defineProperty(globalThis, 'localStorage', { value: localStorage, configurable: true });

const { persistAquariums } = await import('../src/services/aquarium/aquarium-state.service');
const { persistDiagnosisRecords } = await import('../src/services/diagnosis/diagnosis-records.service');
const care = await import('../src/services/care/care-activity.service');

let appChanges = 0;
let careChanges = 0;
window.addEventListener('aquaguide:app-state-changed', () => { appChanges += 1; });
window.addEventListener(care.CARE_ACTIVITY_CHANGED_EVENT, () => { careChanges += 1; });

const tank = { id: 'tank-1', name: '测试缸', fishes: [], waterType: 'Freshwater' as const };
persistAquariums([tank], tank.id);
assert.equal(JSON.parse(localStorage.getItem('aquariums') || '[]')[0].id, tank.id);

const diagnosis = [{
  id: 'check-1',
  diagnosisId: 'check-1',
  aquariumId: tank.id,
  createdAt: '2026-07-14T09:00:00.000Z',
  problemType: '巡检' as const,
  answers: {},
  resultSummary: '状态正常',
  riskLevel: '低风险',
  conclusion: '状态正常',
  keyMetrics: [],
  suggestedActions: [],
  avoidActions: [],
  observeItems: [],
  missingInfo: [],
  optionalMissingInfo: [],
  nextCheckAt: '2026-07-15T09:00:00.000Z',
  followUpNotes: [],
}];
persistDiagnosisRecords(diagnosis);
assert.equal(JSON.parse(localStorage.getItem('aquarium_diagnosis_records') || '[]').length, 1);

localStorage.setItem(care.CARE_REMINDERS_STORAGE_KEY, JSON.stringify([
  { id: 'legacy-guide', title: '旧养护提醒', type: 'observation', createdAt: '2026-07-14T09:00:00.000Z', label: '3 天后提醒观察' },
]));
const legacyReminder = care.getCareReminders()[0];
assert.equal(legacyReminder.sourceTopicId, 'legacy-guide');
assert.equal(legacyReminder.scheduledFor, '2026-07-17T09:00:00.000Z');

const reminder = care.upsertCareReminder({
  sourceTopicId: 'guide-1',
  title: '新鱼过水',
  type: 'observation',
  aquariumId: tank.id,
  scheduledFor: '2026-07-15T09:00:00.000Z',
  label: '明天提醒复查',
});
const updatedReminder = care.upsertCareReminder({
  sourceTopicId: 'guide-1',
  title: '新鱼过水',
  type: 'observation',
  aquariumId: tank.id,
  scheduledFor: '2026-07-17T09:00:00.000Z',
  label: '3 天后提醒复查',
});
assert.equal(updatedReminder.id, reminder.id);
assert.equal(care.getCareReminders().filter((item: { sourceTopicId: string }) => item.sourceTopicId === 'guide-1').length, 1);
assert.equal(care.getCareReminderStatus(updatedReminder, new Date('2026-07-16T12:00:00.000Z')), 'upcoming');
care.rescheduleCareReminder(reminder.id, '2026-07-16T09:00:00.000Z', '2 天后提醒');
care.completeCareReminder(reminder.id, '2026-07-16T10:00:00.000Z');
assert.equal(care.getCareReminderStatus(care.getCareReminders().find((item: { id: string }) => item.id === reminder.id)!), 'completed');
care.deleteCareReminder(reminder.id);
assert.equal(care.getCareReminders().some((item: { id: string }) => item.id === reminder.id), false);
care.setCompletedCareOperations([{ id: 'guide-1', title: '新鱼过水', label: '已完成过水', completedAt: '2026-07-14T10:00:00.000Z' }]);
care.setSavedCareChecklists([{ id: 'guide-1', title: '新鱼过水', savedAt: '2026-07-14T10:00:00.000Z', actions: ['对温'] }]);
assert.equal(care.getCareReminders().length, 1);
assert.equal(care.getCompletedCareOperations().length, 1);
assert.equal(care.getSavedCareChecklists().length, 1);
assert.equal(appChanges, 2);
assert.equal(careChanges, 7);

console.log('business state services: aquarium, diagnosis and care writes passed');
