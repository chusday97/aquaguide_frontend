import type { DiagnosisRecord } from '../../modules/diagnosis/diagnosis.types';
import { loadAppStateFromStorage, patchLocalAppState } from '../storage/local-app-state';

export const getLocalDayKey = (dateLike: string | Date) => {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const upsertDiagnosisRecord = (
  records: DiagnosisRecord[],
  record: DiagnosisRecord,
  limit = 50,
) => {
  if (record.problemType !== '巡检') return [record, ...records].slice(0, limit);
  const dayKey = getLocalDayKey(record.createdAt);
  const existing = records.find(item => (
    item.problemType === '巡检'
    && item.aquariumId === record.aquariumId
    && getLocalDayKey(item.createdAt) === dayKey
  ));
  const merged = existing
    ? { ...record, diagnosisId: existing.diagnosisId, id: existing.id || existing.diagnosisId }
    : record;
  return [merged, ...records.filter(item => item !== existing)].slice(0, limit);
};

export const findDailyPatrolRecord = (
  records: DiagnosisRecord[],
  aquariumId: string,
  date: Date = new Date(),
) => records.find(record => (
  record.problemType === '巡检'
  && record.aquariumId === aquariumId
  && getLocalDayKey(record.createdAt) === getLocalDayKey(date)
));

export const persistDiagnosisRecords = (records: DiagnosisRecord[]) => {
  patchLocalAppState({ diagnosisRecords: records });
  const saved = loadAppStateFromStorage().diagnosisRecords as DiagnosisRecord[];
  if (saved.length !== records.length) {
    throw new Error('检查记录没有保存成功，请检查浏览器存储权限后重试。');
  }
  return saved;
};
