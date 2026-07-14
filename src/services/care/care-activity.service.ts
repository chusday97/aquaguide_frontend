export const CARE_REMINDERS_STORAGE_KEY = 'aqua_care_reminders';
export const CARE_COMPLETED_OPERATIONS_STORAGE_KEY = 'aqua_care_completed_operations';
export const CARE_SAVED_CHECKLISTS_STORAGE_KEY = 'aqua_care_saved_checklists';
export const CARE_ACTIVITY_CHANGED_EVENT = 'aquaguide:care-activity-changed';

export type CareReminderRecord = { id: string; title: string; type: string; createdAt: string; label?: string };
export type CareCompletedOperation = { id: string; title: string; label: string; aquariumId?: string; completedAt: string };
export type CareSavedChecklist = { id: string; title: string; savedAt: string; actions: string[] };

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

export const getCareReminders = () => readArray<CareReminderRecord>(CARE_REMINDERS_STORAGE_KEY);
export const setCareReminders = (records: CareReminderRecord[]) => writeArray(CARE_REMINDERS_STORAGE_KEY, records);
export const getCompletedCareOperations = () => readArray<CareCompletedOperation>(CARE_COMPLETED_OPERATIONS_STORAGE_KEY);
export const setCompletedCareOperations = (records: CareCompletedOperation[]) => writeArray(CARE_COMPLETED_OPERATIONS_STORAGE_KEY, records);
export const getSavedCareChecklists = () => readArray<CareSavedChecklist>(CARE_SAVED_CHECKLISTS_STORAGE_KEY);
export const setSavedCareChecklists = (records: CareSavedChecklist[]) => writeArray(CARE_SAVED_CHECKLISTS_STORAGE_KEY, records);
