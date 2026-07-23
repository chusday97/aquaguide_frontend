import { ApiError } from './http';

export const resolveLivestockMemorialReplay = async <T>(input: {
  resourceId?: string;
  replayRequired?: boolean;
  loadReplay: (resourceId: string) => Promise<T | null>;
  assertOwnedSpecies: () => Promise<void>;
}) => {
  if (input.resourceId) {
    const replay = await input.loadReplay(input.resourceId);
    if (replay) return replay;
    if (input.replayRequired) throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', '记录已提交，但暂时无法读取结果。');
  }
  await input.assertOwnedSpecies();
  return null;
};
