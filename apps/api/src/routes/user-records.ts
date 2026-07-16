import { Router } from 'express';
import {
  careEventCreateSchema,
  careReminderCreateSchema,
  careReminderUpdateSchema,
  diagnosisSaveSchema,
  isoDateSchema,
  memorialCreateSchema,
  memorialUpdateSchema,
  uuidSchema,
  versionSchema,
} from '../../../../packages/contracts/src/index';
import { requireAuth } from '../auth';
import {
  authenticatedRequest,
  beginIdempotentWrite,
  camelize,
  deterministicUuid,
  finishIdempotentWrite,
  requireIdempotencyKey,
  snakeize,
  throwDatabaseError,
  throwMissingOrVersionConflict,
  userClientFor,
} from '../data-utils';
import { ApiError, asyncRoute, sendData } from '../http';

const parseId = (value: string, label: string) => {
  const parsed = uuidSchema.safeParse(value);
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', `${label}无效。`);
  return parsed.data;
};

const optionalVersion = (value: unknown) => {
  if (value === undefined) return undefined;
  const parsed = versionSchema.safeParse(Number(value));
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '记录版本无效。');
  return parsed.data;
};

const parseLimit = (value: unknown) => {
  const number = value === undefined ? 50 : Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 100) throw new ApiError(400, 'VALIDATION_ERROR', '分页数量无效。');
  return number;
};

export const userRecordsRouter = Router();
const protectedPrefixes = ['/aquariums/', '/favorites/', '/memorial-records', '/care-reminders', '/care-events'];
userRecordsRouter.use((request, response, next) => (
  protectedPrefixes.some(prefix => request.path.startsWith(prefix))
    ? requireAuth(request, response, next)
    : next()
));
userRecordsRouter.use((request, _response, next) => {
  if (protectedPrefixes.some(prefix => request.path.startsWith(prefix)) && request.method !== 'GET') requireIdempotencyKey(request);
  next();
});

userRecordsRouter.get('/aquariums/:id/daily-checks/:localDate', asyncRoute(async (request, response) => {
  const aquariumId = parseId(request.params.id, '鱼缸标识');
  const localDate = isoDateSchema.safeParse(request.params.localDate);
  if (!localDate.success) throw new ApiError(400, 'VALIDATION_ERROR', '巡检日期无效。');
  const client = userClientFor(request);
  const { data, error } = await client.from('diagnosis_records').select('*').eq('aquarium_id', aquariumId).eq('local_date', localDate.data).eq('problem_type', '巡检').is('deleted_at', null).maybeSingle();
  if (error) throwDatabaseError(error, '巡检记录暂时无法加载。');
  return sendData(request, response, data ? camelize(data) : null);
}));

userRecordsRouter.put('/aquariums/:id/daily-checks/:localDate', asyncRoute(async (request, response) => {
  const aquariumId = parseId(request.params.id, '鱼缸标识');
  const localDate = isoDateSchema.safeParse(request.params.localDate);
  if (!localDate.success) throw new ApiError(400, 'VALIDATION_ERROR', '巡检日期无效。');
  const parsed = diagnosisSaveSchema.safeParse(request.body);
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '巡检结果无效。', parsed.error.flatten());
  const idempotency = await beginIdempotentWrite(request);
  const client = userClientFor(request);
  const userId = authenticatedRequest(request).authUser.id;

  if (idempotency.replay?.resourceId) {
    const { data } = await client.from('diagnosis_records').select('*').eq('id', idempotency.replay.resourceId).maybeSingle();
    if (data) return sendData(request, response, camelize(data));
  }

  const { version, ...body } = parsed.data;
  const normalized = {
    ...snakeize(body),
    owner_id: userId,
    aquarium_id: aquariumId,
    local_date: localDate.data,
    problem_type: '巡检',
  };

  const { data: existing, error: existingError } = await client.from('diagnosis_records').select('id,version').eq('aquarium_id', aquariumId).eq('local_date', localDate.data).eq('problem_type', '巡检').is('deleted_at', null).maybeSingle();
  if (existingError) throwDatabaseError(existingError, '暂时无法确认今日巡检状态。');

  if (existing) {
    if (!version || version !== existing.version) {
      throw new ApiError(409, 'VERSION_CONFLICT', '今日巡检已更新，请刷新后重试。', { currentVersion: existing.version });
    }
    const { data, error } = await client.from('diagnosis_records').update(normalized).eq('id', existing.id).eq('version', version).select('*').maybeSingle();
    if (error) throwDatabaseError(error, '巡检记录没有更新成功。');
    if (!data) await throwMissingOrVersionConflict(client, 'diagnosis_records', existing.id);
    await finishIdempotentWrite(request, idempotency, 'diagnosis_record', existing.id, 200);
    return sendData(request, response, camelize(data));
  }

  const id = deterministicUuid(`${userId}:${aquariumId}:daily-check:${localDate.data}`);
  const { data, error } = await client.from('diagnosis_records').insert({ id, ...normalized }).select('*').single();
  if (error || !data) throwDatabaseError(error, '巡检记录没有保存成功。');
  await finishIdempotentWrite(request, idempotency, 'diagnosis_record', id, 201);
  return sendData(request, response, camelize(data), 201);
}));

const registerFavoriteRoutes = (type: 'species' | 'care') => {
  const table = type === 'species' ? 'species_favorites' : 'care_favorites';
  const idColumn = type === 'species' ? 'species_id' : 'article_id';
  const route = `/favorites/${type}`;

  userRecordsRouter.get(route, asyncRoute(async (request, response) => {
    const client = userClientFor(request);
    const { data, error } = await client.from(table).select('*').is('deleted_at', null).order('created_at', { ascending: false });
    if (error) throwDatabaseError(error, '收藏暂时无法加载。');
    return sendData(request, response, camelize(data || []));
  }));

  userRecordsRouter.put(`${route}/:contentId`, asyncRoute(async (request, response) => {
    const contentId = parseId(request.params.contentId, '内容标识');
    const idempotency = await beginIdempotentWrite(request);
    const client = userClientFor(request);
    const userId = authenticatedRequest(request).authUser.id;
    const id = deterministicUuid(`${userId}:favorite:${type}:${contentId}`);
    const { data, error } = await client.from(table).upsert({
      id,
      owner_id: userId,
      [idColumn]: contentId,
      deleted_at: null,
    }, { onConflict: `owner_id,${idColumn}` }).select('*').single();
    if (error || !data) throwDatabaseError(error, '收藏没有保存成功。');
    await finishIdempotentWrite(request, idempotency, `${type}_favorite`, data.id, 200);
    return sendData(request, response, camelize(data));
  }));

  userRecordsRouter.delete(`${route}/:contentId`, asyncRoute(async (request, response) => {
    const contentId = parseId(request.params.contentId, '内容标识');
    const version = optionalVersion(request.query.version);
    const client = userClientFor(request);
    let builder = client.from(table).update({ deleted_at: new Date().toISOString() }).eq(idColumn, contentId).is('deleted_at', null);
    if (version) builder = builder.eq('version', version);
    const { data, error } = await builder.select('id').maybeSingle();
    if (error) throwDatabaseError(error, '收藏没有移除成功。');
    if (!data) throw new ApiError(404, 'NOT_FOUND', '没有找到这条收藏。');
    return sendData(request, response, { deleted: true });
  }));
};

registerFavoriteRoutes('species');
registerFavoriteRoutes('care');

userRecordsRouter.get('/memorial-records', asyncRoute(async (request, response) => {
  const limit = parseLimit(request.query.limit);
  const client = userClientFor(request);
  const { data, error } = await client.from('memorial_records').select('*').is('deleted_at', null).order('memorial_date', { ascending: false }).limit(limit);
  if (error) throwDatabaseError(error, '生命纪念暂时无法加载。');
  return sendData(request, response, { items: camelize(data || []) });
}));

userRecordsRouter.post('/memorial-records', asyncRoute(async (request, response) => {
  const parsed = memorialCreateSchema.safeParse(request.body);
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '生命纪念内容无效。', parsed.error.flatten());
  const idempotency = await beginIdempotentWrite(request);
  const client = userClientFor(request);
  const userId = authenticatedRequest(request).authUser.id;
  if (idempotency.replay?.resourceId) {
    const { data } = await client.from('memorial_records').select('*').eq('id', idempotency.replay.resourceId).maybeSingle();
    if (data) return sendData(request, response, camelize(data));
  }
  const { data: species, error: speciesError } = await client.from('species').select('id').eq('catalog_key', parsed.data.speciesCatalogKey).maybeSingle();
  if (speciesError) throwDatabaseError(speciesError, '暂时无法核对物种。');
  const id = deterministicUuid(`${userId}:memorial:${idempotency.key}`);
  const { data, error } = await client.from('memorial_records').insert({
    id,
    owner_id: userId,
    aquarium_id: parsed.data.aquariumId,
    species_id: species?.id,
    species_catalog_key: parsed.data.speciesCatalogKey,
    memorial_date: parsed.data.memorialDate,
    reason: parsed.data.reason,
  }).select('*').single();
  if (error || !data) throwDatabaseError(error, '生命纪念没有保存成功。');
  await finishIdempotentWrite(request, idempotency, 'memorial_record', id, 201);
  return sendData(request, response, camelize(data), 201);
}));

userRecordsRouter.patch('/memorial-records/:id', asyncRoute(async (request, response) => {
  const id = parseId(request.params.id, '纪念记录标识');
  const parsed = memorialUpdateSchema.safeParse(request.body);
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '纪念记录更新无效。', parsed.error.flatten());
  const { version, ...updates } = parsed.data;
  const client = userClientFor(request);
  const { data, error } = await client.from('memorial_records').update(snakeize(updates)).eq('id', id).eq('version', version).is('deleted_at', null).select('*').maybeSingle();
  if (error) throwDatabaseError(error, '生命纪念没有更新成功。');
  if (!data) await throwMissingOrVersionConflict(client, 'memorial_records', id);
  return sendData(request, response, camelize(data));
}));

userRecordsRouter.delete('/memorial-records/:id', asyncRoute(async (request, response) => {
  const id = parseId(request.params.id, '纪念记录标识');
  const version = optionalVersion(request.query.version);
  if (!version) throw new ApiError(400, 'VALIDATION_ERROR', '删除纪念记录需要当前版本。');
  const client = userClientFor(request);
  const { data, error } = await client.from('memorial_records').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('version', version).is('deleted_at', null).select('id').maybeSingle();
  if (error) throwDatabaseError(error, '生命纪念没有删除成功。');
  if (!data) await throwMissingOrVersionConflict(client, 'memorial_records', id);
  return sendData(request, response, { deleted: true });
}));

userRecordsRouter.get('/care-reminders', asyncRoute(async (request, response) => {
  const client = userClientFor(request);
  let builder = client.from('care_reminders').select('*').is('deleted_at', null).order('scheduled_for');
  if (request.query.aquariumId) builder = builder.eq('aquarium_id', parseId(String(request.query.aquariumId), '鱼缸标识'));
  const { data, error } = await builder;
  if (error) throwDatabaseError(error, '养护计划暂时无法加载。');
  return sendData(request, response, camelize(data || []));
}));

userRecordsRouter.post('/care-reminders', asyncRoute(async (request, response) => {
  const parsed = careReminderCreateSchema.safeParse(request.body);
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '养护计划无效。', parsed.error.flatten());
  const idempotency = await beginIdempotentWrite(request);
  const client = userClientFor(request);
  const userId = authenticatedRequest(request).authUser.id;
  if (idempotency.replay?.resourceId) {
    const { data } = await client.from('care_reminders').select('*').eq('id', idempotency.replay.resourceId).maybeSingle();
    if (data) return sendData(request, response, camelize(data));
  }
  const { data: article, error: articleError } = await client.from('care_articles').select('id').eq('catalog_key', parsed.data.sourceCatalogKey).maybeSingle();
  if (articleError) throwDatabaseError(articleError, '暂时无法核对养护文章。');
  const aquariumKey = parsed.data.aquariumId || 'global';
  let existingQuery = client.from('care_reminders').select('id,version').eq('owner_id', userId).eq('source_catalog_key', parsed.data.sourceCatalogKey).is('completed_at', null).is('deleted_at', null);
  existingQuery = parsed.data.aquariumId
    ? existingQuery.eq('aquarium_id', parsed.data.aquariumId)
    : existingQuery.is('aquarium_id', null);
  const { data: existing, error: existingError } = await existingQuery.maybeSingle();
  if (existingError) throwDatabaseError(existingError, '暂时无法确认养护计划。');
  if (existing) {
    const { data, error } = await client.from('care_reminders').update({ scheduled_for: parsed.data.scheduledFor, label: parsed.data.label, title: parsed.data.title, reminder_type: parsed.data.reminderType }).eq('id', existing.id).eq('version', existing.version).select('*').single();
    if (error || !data) throwDatabaseError(error, '养护计划没有更新成功。');
    await finishIdempotentWrite(request, idempotency, 'care_reminder', existing.id, 200);
    return sendData(request, response, camelize(data));
  }
  const id = deterministicUuid(`${userId}:care-reminder:${parsed.data.sourceCatalogKey}:${aquariumKey}`);
  const { data, error } = await client.from('care_reminders').insert({
    id,
    owner_id: userId,
    aquarium_id: parsed.data.aquariumId,
    source_article_id: article?.id,
    source_catalog_key: parsed.data.sourceCatalogKey,
    title: parsed.data.title,
    reminder_type: parsed.data.reminderType,
    scheduled_for: parsed.data.scheduledFor,
    label: parsed.data.label,
  }).select('*').single();
  if (error || !data) throwDatabaseError(error, '养护计划没有保存成功。');
  await finishIdempotentWrite(request, idempotency, 'care_reminder', id, 201);
  return sendData(request, response, camelize(data), 201);
}));

userRecordsRouter.patch('/care-reminders/:id', asyncRoute(async (request, response) => {
  const id = parseId(request.params.id, '养护计划标识');
  const parsed = careReminderUpdateSchema.safeParse(request.body);
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '养护计划更新无效。', parsed.error.flatten());
  const { version, ...updates } = parsed.data;
  const normalized = { ...updates, completedAt: updates.completedAt === null ? null : updates.completedAt };
  const client = userClientFor(request);
  const { data, error } = await client.from('care_reminders').update(snakeize(normalized)).eq('id', id).eq('version', version).is('deleted_at', null).select('*').maybeSingle();
  if (error) throwDatabaseError(error, '养护计划没有更新成功。');
  if (!data) await throwMissingOrVersionConflict(client, 'care_reminders', id);
  return sendData(request, response, camelize(data));
}));

userRecordsRouter.delete('/care-reminders/:id', asyncRoute(async (request, response) => {
  const id = parseId(request.params.id, '养护计划标识');
  const version = optionalVersion(request.query.version);
  if (!version) throw new ApiError(400, 'VALIDATION_ERROR', '删除养护计划需要当前版本。');
  const client = userClientFor(request);
  const { data, error } = await client.from('care_reminders').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('version', version).is('deleted_at', null).select('id').maybeSingle();
  if (error) throwDatabaseError(error, '养护计划没有删除成功。');
  if (!data) await throwMissingOrVersionConflict(client, 'care_reminders', id);
  return sendData(request, response, { deleted: true });
}));

userRecordsRouter.get('/care-events', asyncRoute(async (request, response) => {
  const limit = parseLimit(request.query.limit);
  const client = userClientFor(request);
  let builder = client.from('care_events').select('*').is('deleted_at', null).order('occurred_at', { ascending: false }).limit(limit);
  if (request.query.aquariumId) builder = builder.eq('aquarium_id', parseId(String(request.query.aquariumId), '鱼缸标识'));
  if (request.query.type) builder = builder.eq('event_type', String(request.query.type));
  const { data, error } = await builder;
  if (error) throwDatabaseError(error, '养护记录暂时无法加载。');
  return sendData(request, response, { items: camelize(data || []) });
}));

userRecordsRouter.post('/care-events', asyncRoute(async (request, response) => {
  const parsed = careEventCreateSchema.safeParse(request.body);
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '养护记录无效。', parsed.error.flatten());
  const idempotency = await beginIdempotentWrite(request);
  const client = userClientFor(request);
  const userId = authenticatedRequest(request).authUser.id;
  if (idempotency.replay?.resourceId) {
    const { data } = await client.from('care_events').select('*').eq('id', idempotency.replay.resourceId).maybeSingle();
    if (data) return sendData(request, response, camelize(data));
  }
  const id = deterministicUuid(`${userId}:care-event:${idempotency.key}`);
  const { data, error } = await client.from('care_events').insert({ id, owner_id: userId, ...snakeize(parsed.data) }).select('*').single();
  if (error || !data) throwDatabaseError(error, '养护记录没有保存成功。');
  await finishIdempotentWrite(request, idempotency, 'care_event', id, 201);
  return sendData(request, response, camelize(data), 201);
}));
