import { ApiAquaGuideRepository } from './api-aquaguide.repository';
import type { AquaGuideRepository } from './aquaguide.repository';
import { LocalAquaGuideRepository } from './local-aquaguide.repository';

export type RepositoryMode = 'local' | 'cloud';

const localRepository = new LocalAquaGuideRepository();
const apiRepository = new ApiAquaGuideRepository();

export const getAquaGuideRepository = (mode: RepositoryMode): AquaGuideRepository => (
  mode === 'cloud' ? apiRepository : localRepository
);
