import posthog from 'posthog-js';

export const CARE_REMINDERS_STORAGE_KEY = 'aqua_care_reminders';
export const CARE_COMPLETED_OPERATIONS_STORAGE_KEY = 'aqua_care_completed_operations';
export const CARE_SAVED_CHECKLISTS_STORAGE_KEY = 'aqua_care_saved_checklists';
export const CARE_ACTIVITY_CHANGED_EVENT = 'aquaguide:care-activity-changed';

export type CareReminderRecord = {
  id: string;
  sourceTopicId: string;
  title: string;
  type: string;
  createdAt: string;
  scheduledFor: string;
  aquariumId?: string;
  label?: string;
  completedAt?: string;
};
export type CareReminderStatus = 'overdue' | 'today' | 'upcoming' | 'completed';
export type CareCompletedOperation = { id: string; title: string; label: string; aquariumId?: string; completedAt: string };
export type CareSavedChecklist = { id: string; title: string; savedAt: string; actions: string[] };

type LegacyCareReminderRecord = Partial<CareReminderRecord> & {
  id: string;
  title: string;
  type: string;
  createdAt: string;
};

const addTime = (source: Date, amount: number, unit: 'hour' | 'day') => {
  const next = new Date(source);
  if (unit === 'hour') next.setHours(next.getHours() + amount);
  else next.setDate(next.getDate() + amount);
  return next;
};

const inferScheduledFor = (record: LegacyCareReminderRecord) => {
  const createdAt = new Date(record.createdAt);
  const base = Number.isNaN(createdAt.getTime()) ? new Date() : createdAt;
  const label = record.label || '';
  const hourMatch = label.match(/(\d+)\s*小时/);
  if (hourMatch) return addTime(base, Number(hourMatch[1]), 'hour').toISOString();
  if (/明天/.test(label)) return addTime(base, 1, 'day').toISOString();
  const dayMatch = label.match(/(\d+)\s*天后/);
  if (dayMatch) return addTime(base, Number(dayMatch[1]), 'day').toISOString();
  return addTime(base, 1, 'day').toISOString();
};

export const normalizeCareReminder = (record: LegacyCareReminderRecord): CareReminderRecord => ({
  id: record.id,
  sourceTopicId: record.sourceTopicId || record.id.split(':')[0] || record.id,
  title: record.title,
  type: record.type,
  createdAt: record.createdAt,
  scheduledFor: record.scheduledFor && !Number.isNaN(new Date(record.scheduledFor).getTime())
    ? record.scheduledFor
    : inferScheduledFor(record),
  aquariumId: record.aquariumId,
  label: record.label,
  completedAt: record.completedAt,
});

const readArray = <T,>(key: string): T[] => {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const writeArray = <T,>(key: string, value: T[]) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(CARE_ACTIVITY_CHANGED_EVENT));
    return value;
  } catch {
    throw new Error('养护记录没有保存成功，请检查浏览器存储权限后重试。');
  }
};

export const getCareReminders = () => readArray<LegacyCareReminderRecord>(CARE_REMINDERS_STORAGE_KEY).map(normalizeCareReminder);
export const setCareReminders = (records: CareReminderRecord[]) => writeArray(CARE_REMINDERS_STORAGE_KEY, records);
export const upsertCareReminder = (input: Omit<CareReminderRecord, 'id' | 'createdAt'>) => {
  const current = getCareReminders();
  const identity = `${input.sourceTopicId}:${input.aquariumId || 'global'}`;
  const existing = current.find(item => !item.completedAt && `${item.sourceTopicId}:${item.aquariumId || 'global'}` === identity);
  const nextRecord: CareReminderRecord = {
    ...input,
    id: existing?.id || `${identity}:${Date.now()}`,
    createdAt: existing?.createdAt || new Date().toISOString(),
  };
  setCareReminders([nextRecord, ...current.filter(item => item.id !== existing?.id)]);
  return nextRecord;
};

export const completeCareReminder = (id: string, completedAt = new Date().toISOString()) => {
  const current = getCareReminders();
  const target = current.find(item => item.id === id);
  if (!target) throw new Error('没有找到这条养护计划。');
  const next = current.map(item => item.id === id ? { ...item, completedAt } : item);
  setCareReminders(next);
  posthog.capture('care_reminder_completed', { reminder_type: target.type });
  return next.find(item => item.id === id)!;
};

export const rescheduleCareReminder = (id: string, scheduledFor: string, label?: string) => {
  if (Number.isNaN(new Date(scheduledFor).getTime())) throw new Error('新的提醒时间无效。');
  const current = getCareReminders();
  const target = current.find(item => item.id === id);
  if (!target) throw new Error('没有找到这条养护计划。');
  const next = current.map(item => item.id === id ? { ...item, scheduledFor, label, completedAt: undefined } : item);
  setCareReminders(next);
  return next.find(item => item.id === id)!;
};

export const deleteCareReminder = (id: string) => {
  const current = getCareReminders();
  if (!current.some(item => item.id === id)) throw new Error('没有找到这条养护计划。');
  return setCareReminders(current.filter(item => item.id !== id));
};

const startOfLocalDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();

export const getCareReminderStatus = (record: CareReminderRecord, now = new Date()): CareReminderStatus => {
  if (record.completedAt) return 'completed';
  const scheduled = new Date(record.scheduledFor);
  const scheduledDay = startOfLocalDay(scheduled);
  const today = startOfLocalDay(now);
  if (scheduledDay < today) return 'overdue';
  if (scheduledDay === today) return 'today';
  return 'upcoming';
};

export const subscribeToCareActivity = (listener: () => void) => {
  window.addEventListener(CARE_ACTIVITY_CHANGED_EVENT, listener);
  return () => window.removeEventListener(CARE_ACTIVITY_CHANGED_EVENT, listener);
};
export const getCompletedCareOperations = () => readArray<CareCompletedOperation>(CARE_COMPLETED_OPERATIONS_STORAGE_KEY);
export const setCompletedCareOperations = (records: CareCompletedOperation[]) => writeArray(CARE_COMPLETED_OPERATIONS_STORAGE_KEY, records);
export const getSavedCareChecklists = () => readArray<CareSavedChecklist>(CARE_SAVED_CHECKLISTS_STORAGE_KEY);
export const setSavedCareChecklists = (records: CareSavedChecklist[]) => writeArray(CARE_SAVED_CHECKLISTS_STORAGE_KEY, records);
