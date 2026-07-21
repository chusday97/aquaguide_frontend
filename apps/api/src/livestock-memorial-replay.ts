import { ApiError } from './http';

export const resolveLivestockMemorialReplay = async <T>(input: {
  resourceId?: string;
  loadReplay: (resourceId: string) => Promise<T | null>;
  assertOwnedSpecies: () => Promise<void>;
}) => {
  if (input.resourceId) {
    const replay = await input.loadReplay(input.resourceId);
    if (!replay) throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', '记录已提交，但暂时无法读取结果。');
    return replay;
  }
  await input.assertOwnedSpecies();
  return null;
};
