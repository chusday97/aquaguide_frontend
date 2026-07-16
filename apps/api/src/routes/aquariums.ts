import { Router } from 'express';
import {
  aquariumComponentCreateSchema,
  aquariumComponentUpdateSchema,
  aquariumCreateSchema,
  aquariumEquipmentUpsertSchema,
  aquariumSpeciesCreateSchema,
  aquariumSpeciesUpdateSchema,
  aquariumUpdateSchema,
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

type DbRow = Record<string, any>;

const parseId = (value: string, label: string) => {
  const parsed = uuidSchema.safeParse(value);
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', `${label}无效。`);
  return parsed.data;
};

const mapAquarium = (row: DbRow) => ({
  ...camelize<DbRow>(row),
  species: (row.aquarium_species || []).filter((item: DbRow) => !item.deleted_at).map((item: DbRow) => camelize(item)),
  equipment: (row.aquarium_equipment || []).find((item: DbRow) => !item.deleted_at)
    ? camelize((row.aquarium_equipment || []).find((item: DbRow) => !item.deleted_at))
    : undefined,
  components: (row.aquarium_components || []).filter((item: DbRow) => !item.deleted_at).map((item: DbRow) => camelize(item)),
  aquariumSpecies: undefined,
  aquariumEquipment: undefined,
  aquariumComponents: undefined,
});

const aquariumSelect = '*,aquarium_species(*),aquarium_equipment(*),aquarium_components(*)';

export const aquariumsRouter = Router();
aquariumsRouter.use((request, response, next) => (
  request.path.startsWith('/aquariums') ? requireAuth(request, response, next) : next()
));
aquariumsRouter.use((request, _response, next) => {
  if (request.path.startsWith('/aquariums') && request.method !== 'GET') requireIdempotencyKey(request);
  next();
});

aquariumsRouter.get('/aquariums', asyncRoute(async (request, response) => {
  const client = userClientFor(request);
  const { data, error } = await client
    .from('aquariums')
    .select(aquariumSelect)
    .is('deleted_at', null)
    .order('created_at');
  if (error) throwDatabaseError(error, '鱼缸数据暂时无法加载。');
  return sendData(request, response, (data || []).map(mapAquarium));
}));

aquariumsRouter.post('/aquariums', asyncRoute(async (request, response) => {
  const parsed = aquariumCreateSchema.safeParse(request.body);
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '鱼缸信息不完整。', parsed.error.flatten());
  const idempotency = await beginIdempotentWrite(request);
  const client = userClientFor(request);
  const userId = authenticatedRequest(request).authUser.id;

  if (idempotency.replay?.resourceId) {
    const { data } = await client.from('aquariums').select(aquariumSelect).eq('id', idempotency.replay.resourceId).maybeSingle();
    if (data) return sendData(request, response, mapAquarium(data));
  }

  const id = deterministicUuid(`${userId}:aquarium:${idempotency.key}`);
  const { data, error } = await client
    .from('aquariums')
    .insert({ id, owner_id: userId, ...snakeize(parsed.data) })
    .select(aquariumSelect)
    .single();
  if (error || !data) throwDatabaseError(error, '鱼缸没有保存成功。');
  await finishIdempotentWrite(request, idempotency, 'aquarium', id, 201);
  return sendData(request, response, mapAquarium(data), 201);
}));

aquariumsRouter.get('/aquariums/:id', asyncRoute(async (request, response) => {
  const id = parseId(request.params.id, '鱼缸标识');
  const client = userClientFor(request);
  const { data, error } = await client.from('aquariums').select(aquariumSelect).eq('id', id).is('deleted_at', null).maybeSingle();
  if (error) throwDatabaseError(error, '鱼缸数据暂时无法加载。');
  if (!data) throw new ApiError(404, 'NOT_FOUND', '没有找到这个鱼缸。');
  return sendData(request, response, mapAquarium(data));
}));

aquariumsRouter.patch('/aquariums/:id', asyncRoute(async (request, response) => {
  const id = parseId(request.params.id, '鱼缸标识');
  const parsed = aquariumUpdateSchema.safeParse(request.body);
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '鱼缸更新内容无效。', parsed.error.flatten());
  const { version, ...updates } = parsed.data;
  const client = userClientFor(request);
  const { data, error } = await client
    .from('aquariums')
    .update(snakeize(updates))
    .eq('id', id)
    .eq('version', version)
    .is('deleted_at', null)
    .select(aquariumSelect)
    .maybeSingle();
  if (error) throwDatabaseError(error, '鱼缸没有更新成功。');
  if (!data) await throwMissingOrVersionConflict(client, 'aquariums', id);
  return sendData(request, response, mapAquarium(data));
}));

aquariumsRouter.delete('/aquariums/:id', asyncRoute(async (request, response) => {
  const id = parseId(request.params.id, '鱼缸标识');
  const parsed = versionSchema.safeParse(Number(request.query.version));
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '删除鱼缸需要当前版本。');
  const client = userClientFor(request);
  const { data, error } = await client
    .from('aquariums')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('version', parsed.data)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();
  if (error) throwDatabaseError(error, '鱼缸没有删除成功。');
  if (!data) await throwMissingOrVersionConflict(client, 'aquariums', id);
  return sendData(request, response, { deleted: true });
}));

aquariumsRouter.post('/aquariums/:id/species', asyncRoute(async (request, response) => {
  const aquariumId = parseId(request.params.id, '鱼缸标识');
  const parsed = aquariumSpeciesCreateSchema.safeParse(request.body);
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '入缸物种信息无效。', parsed.error.flatten());
  const idempotency = await beginIdempotentWrite(request);
  const client = userClientFor(request);
  const userId = authenticatedRequest(request).authUser.id;

  if (idempotency.replay?.resourceId) {
    const { data } = await client.from('aquarium_species').select('*').eq('id', idempotency.replay.resourceId).maybeSingle();
    if (data) return sendData(request, response, camelize(data));
  }

  const { data: species, error: speciesError } = await client
    .from('species')
    .select('id,catalog_key')
    .eq('catalog_key', parsed.data.speciesCatalogKey)
    .eq('status', 'published')
    .is('deleted_at', null)
    .maybeSingle();
  if (speciesError) throwDatabaseError(speciesError, '暂时无法核对物种。');
  if (!species) throw new ApiError(404, 'NOT_FOUND', '没有找到这个物种。');

  const id = deterministicUuid(`${userId}:${aquariumId}:species:${idempotency.key}`);
  const { data, error } = await client
    .from('aquarium_species')
    .insert({
      id,
      aquarium_id: aquariumId,
      species_id: species.id,
      species_catalog_key: species.catalog_key,
      quantity: parsed.data.quantity,
      entry_date: parsed.data.entryDate,
      last_water_change_at: parsed.data.lastWaterChangeAt,
    })
    .select('*')
    .single();
  if (error || !data) throwDatabaseError(error, '物种没有加入鱼缸。');
  await finishIdempotentWrite(request, idempotency, 'aquarium_species', id, 201);
  return sendData(request, response, camelize(data), 201);
}));

aquariumsRouter.patch('/aquariums/:id/species/:recordId', asyncRoute(async (request, response) => {
  parseId(request.params.id, '鱼缸标识');
  const recordId = parseId(request.params.recordId, '物种记录标识');
  const parsed = aquariumSpeciesUpdateSchema.safeParse(request.body);
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '物种更新内容无效。', parsed.error.flatten());
  const { version, ...updates } = parsed.data;
  const client = userClientFor(request);
  const { data, error } = await client.from('aquarium_species').update(snakeize(updates)).eq('id', recordId).eq('aquarium_id', request.params.id).eq('version', version).is('deleted_at', null).select('*').maybeSingle();
  if (error) throwDatabaseError(error, '物种数量没有更新成功。');
  if (!data) await throwMissingOrVersionConflict(client, 'aquarium_species', recordId);
  return sendData(request, response, camelize(data));
}));

aquariumsRouter.delete('/aquariums/:id/species/:recordId', asyncRoute(async (request, response) => {
  parseId(request.params.id, '鱼缸标识');
  const recordId = parseId(request.params.recordId, '物种记录标识');
  const parsed = versionSchema.safeParse(Number(request.query.version));
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '删除物种需要当前版本。');
  const client = userClientFor(request);
  const { data, error } = await client.from('aquarium_species').update({ deleted_at: new Date().toISOString() }).eq('id', recordId).eq('aquarium_id', request.params.id).eq('version', parsed.data).is('deleted_at', null).select('id').maybeSingle();
  if (error) throwDatabaseError(error, '物种没有移出鱼缸。');
  if (!data) await throwMissingOrVersionConflict(client, 'aquarium_species', recordId);
  return sendData(request, response, { deleted: true });
}));

aquariumsRouter.put('/aquariums/:id/equipment', asyncRoute(async (request, response) => {
  const aquariumId = parseId(request.params.id, '鱼缸标识');
  const parsed = aquariumEquipmentUpsertSchema.safeParse(request.body);
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '设备信息无效。', parsed.error.flatten());
  const client = userClientFor(request);
  const { version, ...updates } = parsed.data;

  if (version) {
    const { data, error } = await client.from('aquarium_equipment').update(snakeize(updates)).eq('aquarium_id', aquariumId).eq('version', version).is('deleted_at', null).select('*').maybeSingle();
    if (error) throwDatabaseError(error, '设备信息没有更新成功。');
    if (!data) {
      const { data: existing } = await client.from('aquarium_equipment').select('id').eq('aquarium_id', aquariumId).is('deleted_at', null).maybeSingle();
      if (!existing) throw new ApiError(404, 'NOT_FOUND', '没有找到鱼缸设备记录。');
      throw new ApiError(409, 'VERSION_CONFLICT', '设备信息已更新，请刷新后重试。');
    }
    return sendData(request, response, camelize(data));
  }

  const { data, error } = await client.from('aquarium_equipment').insert({ aquarium_id: aquariumId, ...snakeize(updates) }).select('*').single();
  if (error || !data) throwDatabaseError(error, '设备信息没有保存成功。');
  return sendData(request, response, camelize(data), 201);
}));

aquariumsRouter.post('/aquariums/:id/components', asyncRoute(async (request, response) => {
  const aquariumId = parseId(request.params.id, '鱼缸标识');
  const parsed = aquariumComponentCreateSchema.safeParse(request.body);
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '环境配置无效。', parsed.error.flatten());
  const idempotency = await beginIdempotentWrite(request);
  const client = userClientFor(request);
  const userId = authenticatedRequest(request).authUser.id;
  if (idempotency.replay?.resourceId) {
    const { data } = await client.from('aquarium_components').select('*').eq('id', idempotency.replay.resourceId).maybeSingle();
    if (data) return sendData(request, response, camelize(data));
  }
  const id = deterministicUuid(`${userId}:${aquariumId}:component:${idempotency.key}`);
  const { data, error } = await client.from('aquarium_components').insert({ id, aquarium_id: aquariumId, ...snakeize(parsed.data) }).select('*').single();
  if (error || !data) throwDatabaseError(error, '环境配置没有保存成功。');
  await finishIdempotentWrite(request, idempotency, 'aquarium_component', id, 201);
  return sendData(request, response, camelize(data), 201);
}));

aquariumsRouter.patch('/aquariums/:id/components/:componentId', asyncRoute(async (request, response) => {
  parseId(request.params.id, '鱼缸标识');
  const componentId = parseId(request.params.componentId, '配置标识');
  const parsed = aquariumComponentUpdateSchema.safeParse(request.body);
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '环境配置更新无效。', parsed.error.flatten());
  const { version, ...updates } = parsed.data;
  const client = userClientFor(request);
  const { data, error } = await client.from('aquarium_components').update(snakeize(updates)).eq('id', componentId).eq('aquarium_id', request.params.id).eq('version', version).is('deleted_at', null).select('*').maybeSingle();
  if (error) throwDatabaseError(error, '环境配置没有更新成功。');
  if (!data) await throwMissingOrVersionConflict(client, 'aquarium_components', componentId);
  return sendData(request, response, camelize(data));
}));

aquariumsRouter.delete('/aquariums/:id/components/:componentId', asyncRoute(async (request, response) => {
  parseId(request.params.id, '鱼缸标识');
  const componentId = parseId(request.params.componentId, '配置标识');
  const parsed = versionSchema.safeParse(Number(request.query.version));
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '删除配置需要当前版本。');
  const client = userClientFor(request);
  const { data, error } = await client.from('aquarium_components').update({ deleted_at: new Date().toISOString() }).eq('id', componentId).eq('aquarium_id', request.params.id).eq('version', parsed.data).is('deleted_at', null).select('id').maybeSingle();
  if (error) throwDatabaseError(error, '环境配置没有删除成功。');
  if (!data) await throwMissingOrVersionConflict(client, 'aquarium_components', componentId);
  return sendData(request, response, { deleted: true });
}));
