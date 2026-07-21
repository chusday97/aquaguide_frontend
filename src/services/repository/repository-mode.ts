import type { LocalAppState } from '../storage/local-app-state';
export type RepositoryMode = 'local' | 'cloud';

export const selectRepositoryMode = (hasSession: boolean, state: LocalAppState): RepositoryMode => {
  if (!hasSession) return 'local';
  const hasLocalBusinessData = state.aquariums.length > 0
    || state.wishlist.length > 0
    || state.diagnosisRecords.length > 0
    || state.compatibilityRecords.length > 0
    || state.deceasedRecords.length > 0;
  return state.cloudMigrationConfirmed || !hasLocalBusinessData ? 'cloud' : 'local';
};
