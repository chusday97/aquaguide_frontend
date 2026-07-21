import type { OnboardingGoal, OnboardingState } from '../../types';
import { getCareFavorites } from '../favorites/favorites.service';
import { loadAppStateFromStorage, patchLocalAppState } from '../storage/local-app-state';

const createState = (patch: Partial<OnboardingState> = {}): OnboardingState => ({
  version: 1,
  status: 'pending',
  viewedSpecies: false,
  taskCardDismissed: false,
  ...patch,
});

export const shouldStartOnboarding = () => {
  const state = loadAppStateFromStorage();
  if (state.onboarding) return false;
  return state.aquariums.length === 0
    && state.wishlist.length === 0
    && Object.keys(getCareFavorites()).length === 0
    && state.diagnosisRecords.length === 0
    && state.deceasedRecords.length === 0
    && state.feedingRecords.length === 0
    && state.observationRecords.length === 0;
};

export const getOnboardingState = () => loadAppStateFromStorage().onboarding;

export const chooseOnboardingGoal = (goal: OnboardingGoal) => patchLocalAppState({
  onboarding: createState({ goal }),
});

export const skipOnboarding = () => patchLocalAppState({
  onboarding: createState({ status: 'skipped' }),
});

export const restartOnboarding = () => {
  const current = getOnboardingState();
  return patchLocalAppState({
    onboarding: createState({
      viewedSpecies: current?.viewedSpecies ?? false,
      taskCardDismissed: false,
    }),
  });
};

export const markSpeciesViewed = () => {
  const current = getOnboardingState();
  if (!current || current.viewedSpecies) return current;
  return patchLocalAppState({ onboarding: { ...current, viewedSpecies: true } }).onboarding;
};

export const dismissOnboardingTaskCard = () => {
  const current = getOnboardingState() ?? createState();
  return patchLocalAppState({ onboarding: { ...current, taskCardDismissed: true } }).onboarding;
};

export interface OnboardingTaskProgress {
  aquariumReady: boolean;
  speciesViewed: boolean;
  speciesChosen: boolean;
  dailyCheckDone: boolean;
  completedCount: number;
  complete: boolean;
}

export const getOnboardingTaskProgress = (): OnboardingTaskProgress => {
  const state = loadAppStateFromStorage();
  const aquariumReady = state.aquariums.length > 0;
  const speciesViewed = state.onboarding?.viewedSpecies ?? false;
  const speciesChosen = state.wishlist.length > 0 || state.aquariums.some(aquarium => aquarium.fishes.some(fish => fish.quantity > 0));
  const dailyCheckDone = state.diagnosisRecords.some(record => {
    if (!record || typeof record !== 'object') return false;
    return (record as { problemType?: string }).problemType === '巡检';
  });
  const completedCount = [aquariumReady, speciesViewed, speciesChosen, dailyCheckDone].filter(Boolean).length;
  return { aquariumReady, speciesViewed, speciesChosen, dailyCheckDone, completedCount, complete: completedCount === 4 };
};

export const syncOnboardingCompletion = () => {
  const current = getOnboardingState();
  const progress = getOnboardingTaskProgress();
  if (!current || !progress.complete || current.status === 'completed') return current;
  return patchLocalAppState({
    onboarding: { ...current, status: 'completed', completedAt: new Date().toISOString() },
  }).onboarding;
};
