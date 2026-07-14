import { fishData } from '../../data/fishData';
import type { DiagnosisRecord } from '../../modules/diagnosis/diagnosis.types';
import type {
  AchievementId,
  AchievementProgress,
  CollectionCounts,
  MemorialItem,
} from '../../modules/collection/collection.types';
import { evaluateTankCompatibility } from '../../lib/tankCompatibilityEngine';
import {
  getCareFavorites,
  getSpeciesFavoriteIds,
  subscribeToFavorites,
  type CareFavoriteMap,
} from '../favorites/favorites.service';
import {
  loadAppStateFromStorage,
  subscribeToAppState,
  type LocalAppState,
} from '../storage/local-app-state';

export type CollectionSnapshot = {
  appState: LocalAppState;
  wishlistIds: string[];
  careFavorites: CareFavoriteMap;
  memorials: MemorialItem[];
  achievements: AchievementProgress[];
  counts: CollectionCounts;
};

const normalizeMemorials = (value: unknown[]): MemorialItem[] => value
  .map((item): MemorialItem | null => {
    if (!item || typeof item !== 'object') return null;
    const record = item as Partial<MemorialItem>;
    if (typeof record.id !== 'string' || typeof record.fishId !== 'string' || typeof record.date !== 'string') return null;
    return {
      id: record.id,
      fishId: record.fishId,
      date: record.date,
      reason: typeof record.reason === 'string' ? record.reason.trim() : undefined,
    };
  })
  .filter((item): item is MemorialItem => Boolean(item))
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

const toLocalDateKey = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const longestConsecutiveDays = (values: string[]) => {
  const timestamps = Array.from(new Set(values.map(toLocalDateKey).filter(Boolean)))
    .map(value => new Date(`${value}T00:00:00`).getTime())
    .sort((a, b) => a - b);
  let longest = 0;
  let current = 0;
  let previous = 0;
  timestamps.forEach(timestamp => {
    current = previous && timestamp - previous === 86_400_000 ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = timestamp;
  });
  return longest;
};

const hasCompatibleCommunity = (appState: LocalAppState) => appState.aquariums.some(aquarium => {
  const uniqueRecords = aquarium.fishes.filter((record, index, records) => (
    record.quantity > 0 && records.findIndex(item => item.fishId === record.fishId) === index
  ));
  if (uniqueRecords.length < 2) return false;

  return uniqueRecords.every(candidateRecord => {
    const candidateSpecies = fishData.find(item => item.id === candidateRecord.fishId);
    if (!candidateSpecies) return false;
    const existingSpecies = uniqueRecords
      .filter(item => item.fishId !== candidateRecord.fishId)
      .map(record => ({
        species: fishData.find(item => item.id === record.fishId) || null,
        record: { quantity: record.quantity },
      }));
    return evaluateTankCompatibility({
      tank: aquarium,
      existingSpecies,
      candidateSpecies,
      candidateQuantity: candidateRecord.quantity,
      scope: 'tank',
    }).status === 'compatible';
  });
});

type AchievementDefinition = {
  id: AchievementId;
  title: string;
  description: string;
  target: number;
  current: number;
  nextAction: AchievementProgress['nextAction'];
};

const createProgress = (definition: AchievementDefinition): AchievementProgress => ({
  id: definition.id,
  title: definition.title,
  description: definition.description,
  current: Math.min(definition.current, definition.target),
  target: definition.target,
  unlocked: definition.current >= definition.target,
  nextAction: definition.current >= definition.target ? undefined : definition.nextAction,
});

export const evaluateAchievements = (
  appState: LocalAppState,
  wishlistCount: number,
  careFavoriteCount: number,
  memorials: MemorialItem[],
) => {
  const patrolRecords = (appState.diagnosisRecords as Array<Partial<DiagnosisRecord>>)
    .filter(record => record.problemType === '巡检' && typeof record.createdAt === 'string');
  const waterChangeDays = Array.from(new Set(appState.aquariums.flatMap(aquarium => (
    (aquarium.waterChangeHistory || []).map(toLocalDateKey).filter(Boolean)
  ))));
  const hasAquariumResident = appState.aquariums.some(aquarium => aquarium.fishes.some(record => record.quantity > 0));
  const patrolStreak = longestConsecutiveDays(patrolRecords.map(record => record.createdAt || ''));
  const compatibleCommunity = hasCompatibleCommunity(appState);
  const reflectionCount = memorials.filter(record => Boolean(record.reason?.trim())).length;

  return [
    createProgress({ id: 'first_aquarium', title: '初心缸主', description: '创建鱼缸并迎来第一位成员', current: hasAquariumResident ? 1 : 0, target: 1, nextAction: { label: '去添加生物', route: '/aquarium#add-species' } }),
    createProgress({ id: 'first_daily_check', title: '今日观察员', description: '完成第一次每日鱼缸检查', current: patrolRecords.length, target: 1, nextAction: { label: '开始每日检查', route: '/aquarium#daily-check' } }),
    createProgress({ id: 'seven_day_guardian', title: '七日守护', description: '连续七个自然日完成巡检', current: patrolStreak, target: 7, nextAction: { label: '继续今日检查', route: '/aquarium#daily-check' } }),
    createProgress({ id: 'water_change_routine', title: '换水有序', description: '在三个不同日期记录换水', current: waterChangeDays.length, target: 3, nextAction: { label: '记录本次换水', route: '/aquarium#aquarium-actions' } }),
    createProgress({ id: 'wishlist_collector', title: '有备而来', description: '种草五种想进一步了解的生物', current: wishlistCount, target: 5, nextAction: { label: '浏览图鉴', route: '/encyclopedia' } }),
    createProgress({ id: 'care_learner', title: '求知有方', description: '收藏三篇常用养护内容', current: careFavoriteCount, target: 3, nextAction: { label: '查养护百科', route: '/care' } }),
    createProgress({ id: 'compatible_community', title: '和谐共生', description: '同缸两种以上生物均通过完整混养判断', current: compatibleCommunity ? 1 : 0, target: 1, nextAction: { label: '检查混养组合', route: '/encyclopedia#compatibility' } }),
    createProgress({ id: 'life_reflection', title: '认真复盘', description: '为一条生命纪念补充原因记录', current: reflectionCount, target: 1, nextAction: { label: '查看生命纪念', route: '/collection?tab=memorial' } }),
  ];
};

export const getCollectionSnapshot = (): CollectionSnapshot => {
  const appState = loadAppStateFromStorage();
  const wishlistIds = getSpeciesFavoriteIds();
  const careFavorites = getCareFavorites();
  const memorials = normalizeMemorials(appState.deceasedRecords);
  const achievements = evaluateAchievements(appState, wishlistIds.length, Object.keys(careFavorites).length, memorials);
  return {
    appState,
    wishlistIds,
    careFavorites,
    memorials,
    achievements,
    counts: {
      wishlist: wishlistIds.length,
      care: Object.keys(careFavorites).length,
      memorial: memorials.length,
      achievements: achievements.filter(item => item.unlocked).length,
    },
  };
};

export const subscribeToCollection = (listener: () => void) => {
  const unsubscribeFavorites = subscribeToFavorites(listener);
  const unsubscribeAppState = subscribeToAppState(listener);
  return () => {
    unsubscribeFavorites();
    unsubscribeAppState();
  };
};
