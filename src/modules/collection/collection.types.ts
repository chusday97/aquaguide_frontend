export type CollectionTab = 'wishlist' | 'care' | 'memorial' | 'achievements';

export type AchievementId =
  | 'first_aquarium'
  | 'first_daily_check'
  | 'seven_day_guardian'
  | 'water_change_routine'
  | 'wishlist_collector'
  | 'care_learner'
  | 'compatible_community'
  | 'life_reflection';

export type AchievementNextAction = {
  label: string;
  route: string;
};

export interface AchievementProgress {
  id: AchievementId;
  title: string;
  description: string;
  current: number;
  target: number;
  unlocked: boolean;
  nextAction?: AchievementNextAction;
}

export type MemorialItem = {
  id: string;
  fishId: string;
  date: string;
  reason?: string;
};

export type CollectionCounts = {
  wishlist: number;
  care: number;
  memorial: number;
  achievements: number;
};
