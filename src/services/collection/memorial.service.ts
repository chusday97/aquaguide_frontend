import type { DeceasedRecord } from '../../types';
import { loadAppStateFromStorage, patchLocalAppState } from '../storage/local-app-state';

export type MemorialRecordInput = {
  fishId: string;
  date: string;
  reason: string;
};

const normalizeRecords = (value: unknown[]): DeceasedRecord[] => value.filter((item): item is DeceasedRecord => {
  if (!item || typeof item !== 'object') return false;
  const record = item as Partial<DeceasedRecord>;
  return typeof record.id === 'string' && typeof record.fishId === 'string' && typeof record.date === 'string';
});

const createRecordId = () => (
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 11)
);

export const recordSpeciesMemorial = ({ fishId, date, reason }: MemorialRecordInput) => {
  const normalizedReason = reason.trim();
  if (!fishId || !date || !normalizedReason) {
    throw new Error('请填写日期和原因后再保存。');
  }

  const current = loadAppStateFromStorage();
  const record: DeceasedRecord = {
    id: createRecordId(),
    fishId,
    date: new Date(`${date}T12:00:00`).toISOString(),
    reason: normalizedReason,
  };
  const records = [...normalizeRecords(current.deceasedRecords), record];
  patchLocalAppState({ deceasedRecords: records });

  const saved = normalizeRecords(loadAppStateFromStorage().deceasedRecords);
  if (!saved.some(item => item.id === record.id)) {
    throw new Error('记录没有保存成功，请检查浏览器存储权限后重试。');
  }
  return { record, records: saved };
};
