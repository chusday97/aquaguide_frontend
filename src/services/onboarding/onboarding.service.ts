import type { OnboardingGoal, OnboardingState } from '../../types';
import { onboardingPreferenceSchema } from '../../../packages/contracts/src/index';
import { supabase } from '../../lib/supabaseClient';
import { apiRequest, AquaGuideApiError, createIdempotencyKey } from '../api/api-client';
import { getCareFavorites } from '../favorites/favorites.service';
import { getCareReminders, getCompletedCareOperations, getSavedCareChecklists } from '../care/care-activity.service';
import { loadAppStateFromStorage, patchLocalAppState } from '../storage/local-app-state';

const createState = (patch: Partial<OnboardingState> = {}): OnboardingState => ({
  version: 1,
  status: 'pending',
  viewedSpecies: false,
  aquariumConfigured: false,
  taskCardDismissed: false,
  ...patch,
});

export const ONBOARDING_SYNC_FAILED_EVENT = 'aquaguide:onboarding-sync-failed';

type ProfilePreferenceResponse = {
  version: number;
  preferences?: {
    onboarding?: unknown;
  };
};

const emitSyncFailure = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(ONBOARDING_SYNC_FAILED_EVENT));
};

const hasSignedInUser = async () => {
  if (!supabase) return false;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return Boolean(data.session);
};

const syncOnboardingToProfile = async (onboarding: OnboardingState) => {
  if (!await hasSignedInUser()) return;
  const save = async () => {
    const profile = await apiRequest<ProfilePreferenceResponse>('/profile');
    await apiRequest('/profile', {
      method: 'PATCH',
      body: { onboarding, version: profile.version },
      idempotencyKey: createIdempotencyKey('onboarding-preference'),
    });
  };
  try {
    await save();
  } catch (error) {
    if (error instanceof AquaGuideApiError && error.code === 'VERSION_CONFLICT') {
      await save();
      return;
    }
    throw error;
  }
};

const queueProfileSync = (onboarding: OnboardingState) => {
  void syncOnboardingToProfile(onboarding).catch(() => emitSyncFailure());
};

const persistOnboarding = (onboarding: OnboardingState) => {
  const saved = patchLocalAppState({ onboarding }).onboarding!;
  queueProfileSync(saved);
  return saved;
};

export const hydrateOnboardingFromProfile = async () => {
  try {
    if (!await hasSignedInUser()) return getOnboardingState();
    const profile = await apiRequest<ProfilePreferenceResponse>('/profile');
    const local = getOnboardingState();
    const cloud = onboardingPreferenceSchema.safeParse(profile.preferences?.onboarding);
    if (!local && cloud.success) return patchLocalAppState({ onboarding: cloud.data }).onboarding;
    if (local && !cloud.success) queueProfileSync(local);
    return local;
  } catch {
    emitSyncFailure();
    return getOnboardingState();
  }
};

export const subscribeToOnboardingAuth = (listener: () => void) => {
  if (!supabase) return () => undefined;
  const { data } = supabase.auth.onAuthStateChange(() => listener());
  return () => data.subscription.unsubscribe();
};

export const shouldStartOnboarding = () => {
  const state = loadAppStateFromStorage();
  if (state.onboarding) return false;
  return state.aquariums.length === 0
    && state.wishlist.length === 0
    && state.compatibilityRecords.length === 0
    && Object.keys(getCareFavorites()).length === 0
    && state.diagnosisRecords.length === 0
    && state.deceasedRecords.length === 0
    && state.feedingRecords.length === 0
    && state.observationRecords.length === 0
    && getCareReminders().length === 0
    && getCompletedCareOperations().length === 0
    && getSavedCareChecklists().length === 0;
};

export const getOnboardingState = () => loadAppStateFromStorage().onboarding;

export const chooseOnboardingGoal = (goal: OnboardingGoal) => persistOnboarding(createState({ goal }));

export const skipOnboarding = () => persistOnboarding(createState({ status: 'skipped' }));

export const restartOnboarding = () => {
  const current = getOnboardingState();
  return persistOnboarding(createState({
      viewedSpecies: current?.viewedSpecies ?? false,
      aquariumConfigured: current?.aquariumConfigured ?? false,
      taskCardDismissed: false,
    }));
};

export const markSpeciesViewed = () => {
  const current = getOnboardingState();
  if (!current || current.viewedSpecies) return current;
  return persistOnboarding({ ...current, viewedSpecies: true });
};

export const markAquariumConfigured = () => {
  const current = getOnboardingState();
  if (!current || current.aquariumConfigured) return current;
  return persistOnboarding({ ...current, aquariumConfigured: true });
};

export const dismissOnboardingTaskCard = () => {
  const current = getOnboardingState() ?? createState();
  return persistOnboarding({ ...current, taskCardDismissed: true });
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
  const aquariumReady = state.onboarding?.aquariumConfigured ?? false;
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
  return persistOnboarding({ ...current, status: 'completed', completedAt: new Date().toISOString() });
};
