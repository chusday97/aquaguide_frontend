import { Router } from 'express';
import { profilePreferencesUpdateSchema } from '../../../../packages/contracts/src/index';
import { requireAuth } from '../auth';
import {
  authenticatedRequest,
  beginIdempotentWrite,
  camelize,
  finishIdempotentWrite,
  requireIdempotencyKey,
  throwDatabaseError,
  throwMissingOrVersionConflict,
  userClientFor,
} from '../data-utils';
import { ApiError, asyncRoute, sendData } from '../http';

export const profileRouter = Router();

profileRouter.use('/profile', requireAuth);

profileRouter.get('/profile', asyncRoute(async (request, response) => {
  const client = userClientFor(request);
  const userId = authenticatedRequest(request).authUser.id;
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throwDatabaseError(error, '语言偏好暂时无法加载。');
  if (!data) throw new ApiError(404, 'NOT_FOUND', '没有找到用户资料。');
  return sendData(request, response, camelize(data));
}));

profileRouter.patch('/profile', requireIdempotencyKey, asyncRoute(async (request, response) => {
  const parsed = profilePreferencesUpdateSchema.safeParse(request.body);
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '用户偏好无效。', parsed.error.flatten());

  const idempotency = await beginIdempotentWrite(request);
  const client = userClientFor(request);
  const userId = authenticatedRequest(request).authUser.id;
  const { data: current, error: currentError } = await client
    .from('profiles')
    .select('id,preferences,version')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();
  if (currentError) throwDatabaseError(currentError, '语言偏好暂时无法加载。');
  if (!current) throw new ApiError(404, 'NOT_FOUND', '没有找到用户资料。');

  if (idempotency.replay?.resourceId) {
    const { data } = await client.from('profiles').select('*').eq('id', idempotency.replay.resourceId).maybeSingle();
    if (data) return sendData(request, response, camelize(data));
  }

  const preferences = typeof current.preferences === 'object' && current.preferences !== null
    ? current.preferences as Record<string, unknown>
    : {};
  const { data, error } = await client
    .from('profiles')
    .update({
      preferences: {
        ...preferences,
        ...(parsed.data.locale ? { locale: parsed.data.locale } : {}),
        ...(parsed.data.onboarding ? { onboarding: parsed.data.onboarding } : {}),
      },
    })
    .eq('id', current.id)
    .eq('version', parsed.data.version)
    .select('*')
    .maybeSingle();
  if (error) throwDatabaseError(error, '语言偏好没有保存成功。');
  if (!data) await throwMissingOrVersionConflict(client, 'profiles', current.id);

  await finishIdempotentWrite(request, idempotency, 'profile', current.id, 200);
  return sendData(request, response, camelize(data));
}));
