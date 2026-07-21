import { ApiAquaGuideRepository } from './api-aquaguide.repository';
import type { AquaGuideRepository } from './aquaguide.repository';
import { LocalAquaGuideRepository } from './local-aquaguide.repository';
import { supabase } from '../../lib/supabaseClient';
import { loadAppStateFromStorage } from '../storage/local-app-state';
import { selectRepositoryMode } from './repository-mode';
import type { RepositoryMode } from './repository-mode';

export type { RepositoryMode } from './repository-mode';

const localRepository = new LocalAquaGuideRepository();
const apiRepository = new ApiAquaGuideRepository();

export const getAquaGuideRepository = (mode: RepositoryMode): AquaGuideRepository => (
  mode === 'cloud' ? apiRepository : localRepository
);

export const resolveRepositoryMode = async (): Promise<RepositoryMode> => {
  if (!supabase) return 'local';
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return selectRepositoryMode(Boolean(data.session), loadAppStateFromStorage());
};

export const getCurrentAquaGuideRepository = async () => getAquaGuideRepository(await resolveRepositoryMode());

export const subscribeToRepositoryMode = (listener: (mode: RepositoryMode) => void) => {
  if (!supabase) return () => undefined;
  const { data } = supabase.auth.onAuthStateChange((_event, session) => listener(session ? 'cloud' : 'local'));
  return () => data.subscription.unsubscribe();
};

export { selectRepositoryMode } from './repository-mode';
