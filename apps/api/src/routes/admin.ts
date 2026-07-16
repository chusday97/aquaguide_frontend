import { createHash } from 'node:crypto';
import express, { Router } from 'express';
import sharp from 'sharp';
import {
  assetUploadQuerySchema,
  careArticleAdminInputSchema,
  careArticleAdminUpdateSchema,
  contentStatusMutationSchema,
  speciesAdminInputSchema,
  speciesAdminUpdateSchema,
  uuidSchema,
} from '../../../../packages/contracts/src/index';
import { requireAdmin, requireAuth } from '../auth';
import {
  beginIdempotentWrite,
  camelize,
  deterministicUuid,
  finishIdempotentWrite,
  requireIdempotencyKey,
  snakeize,
  throwDatabaseError,
  throwMissingOrVersionConflict,
} from '../data-utils';
import { ApiError, asyncRoute, sendData } from '../http';
import { getAdminSupabase } from '../supabase';

const supportedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
const originalExtension: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

const parseId = (value: string) => {
  const parsed = uuidSchema.safeParse(value);
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '内容标识无效。');
  return parsed.data;
};

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);
adminRouter.use((request, _response, next) => {
  if (request.method !== 'GET') requireIdempotencyKey(request);
  next();
});

adminRouter.get('/species', asyncRoute(async (request, response) => {
  const client = getAdminSupabase();
  const { data, error } = await client.from('species').select('*,species_assets(*)').order('updated_at', { ascending: false }).limit(100);
  if (error) throwDatabaseError(error, '物种内容暂时无法加载。');
  return sendData(request, response, camelize(data || []));
}));

adminRouter.post('/species', asyncRoute(async (request, response) => {
  const parsed = speciesAdminInputSchema.safeParse(request.body);
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '物种内容无效。', parsed.error.flatten());
  const idempotency = await beginIdempotentWrite(request);
  const client = getAdminSupabase();
  if (idempotency.replay?.resourceId) {
    const { data, error } = await client.from('species').select('*').eq('id', idempotency.replay.resourceId).maybeSingle();
    if (error) throwDatabaseError(error, '暂时无法读取已保存的物种内容。');
    if (data) return sendData(request, response, camelize(data), idempotency.replay.responseStatus);
  }
  const id = deterministicUuid(`catalog:species:${parsed.data.catalogKey}`);
  const { data, error } = await client.from('species').insert({ id, ...snakeize(parsed.data), status: 'draft' }).select('*').single();
  if (error || !data) throwDatabaseError(error, '物种内容没有保存成功。');
  await finishIdempotentWrite(request, idempotency, 'species', id, 201);
  return sendData(request, response, camelize(data), 201);
}));

adminRouter.patch('/species/:id', asyncRoute(async (request, response) => {
  const id = parseId(request.params.id);
  const parsed = speciesAdminUpdateSchema.safeParse(request.body);
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '物种更新内容无效。', parsed.error.flatten());
  const { version, ...updates } = parsed.data;
  const client = getAdminSupabase();
  const { data, error } = await client.from('species').update(snakeize(updates)).eq('id', id).eq('version', version).select('*').maybeSingle();
  if (error) throwDatabaseError(error, '物种内容没有更新成功。');
  if (!data) await throwMissingOrVersionConflict(client, 'species', id);
  return sendData(request, response, camelize(data));
}));

adminRouter.get('/care-articles', asyncRoute(async (request, response) => {
  const client = getAdminSupabase();
  const { data, error } = await client.from('care_articles').select('*,care_article_steps(*),care_article_assets(*)').order('updated_at', { ascending: false }).limit(100);
  if (error) throwDatabaseError(error, '养护内容暂时无法加载。');
  return sendData(request, response, camelize(data || []));
}));

adminRouter.post('/care-articles', asyncRoute(async (request, response) => {
  const parsed = careArticleAdminInputSchema.safeParse(request.body);
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '养护内容无效。', parsed.error.flatten());
  const idempotency = await beginIdempotentWrite(request);
  const client = getAdminSupabase();
  if (idempotency.replay?.resourceId) {
    const { data, error } = await client.from('care_articles').select('*,care_article_steps(*)').eq('id', idempotency.replay.resourceId).maybeSingle();
    if (error) throwDatabaseError(error, '暂时无法读取已保存的养护文章。');
    if (data) return sendData(request, response, camelize(data), idempotency.replay.responseStatus);
  }
  const { steps, ...article } = parsed.data;
  const id = deterministicUuid(`catalog:care:${article.catalogKey}`);
  const { data, error } = await client.from('care_articles').insert({ id, ...snakeize(article), status: 'draft' }).select('*').single();
  if (error || !data) throwDatabaseError(error, '养护文章没有保存成功。');
  if (steps.length > 0) {
    const { error: stepError } = await client.from('care_article_steps').insert(steps.map((step, index) => ({
      id: deterministicUuid(`${id}:step:${index + 1}`),
      article_id: id,
      position: index + 1,
      instruction: step.instruction,
      duration_label: step.durationLabel,
    }))); 
    if (stepError) {
      await client.from('care_articles').delete().eq('id', id);
      throwDatabaseError(stepError, '养护文章的操作步骤没有保存成功。');
    }
  }
  await finishIdempotentWrite(request, idempotency, 'care_article', id, 201);
  return sendData(request, response, camelize(data), 201);
}));

adminRouter.patch('/care-articles/:id', asyncRoute(async (request, response) => {
  const id = parseId(request.params.id);
  const parsed = careArticleAdminUpdateSchema.safeParse(request.body);
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '养护内容更新无效。', parsed.error.flatten());
  const { version, steps, ...updates } = parsed.data;
  const client = getAdminSupabase();
  const { data, error } = await client.from('care_articles').update(snakeize(updates)).eq('id', id).eq('version', version).select('*').maybeSingle();
  if (error) throwDatabaseError(error, '养护文章没有更新成功。');
  if (!data) await throwMissingOrVersionConflict(client, 'care_articles', id);
  if (steps) {
    const { data: existingSteps, error: existingStepsError } = await client
      .from('care_article_steps')
      .select('id,position')
      .eq('article_id', id)
      .is('deleted_at', null)
      .order('position');
    if (existingStepsError) throwDatabaseError(existingStepsError, '暂时无法读取文章步骤。');

    const retainedIds: string[] = [];
    for (const [index, step] of steps.entries()) {
      const existing = existingSteps?.[index];
      if (existing) {
        const { error: stepError } = await client.from('care_article_steps').update({
          position: index + 1,
          instruction: step.instruction,
          duration_label: step.durationLabel,
        }).eq('id', existing.id);
        if (stepError) throwDatabaseError(stepError, '文章步骤没有更新成功。');
        retainedIds.push(existing.id);
      } else {
        const stepId = deterministicUuid(`${id}:step:${index + 1}`);
        const { error: stepError } = await client.from('care_article_steps').insert({
          id: stepId,
          article_id: id,
          position: index + 1,
          instruction: step.instruction,
          duration_label: step.durationLabel,
        });
        if (stepError) throwDatabaseError(stepError, '文章步骤没有保存成功。');
        retainedIds.push(stepId);
      }
    }

    const removedIds = (existingSteps || []).map(step => step.id).filter(stepId => !retainedIds.includes(stepId));
    if (removedIds.length > 0) {
      const { data: linkedAssets, error: linkedAssetsError } = await client
        .from('care_article_assets')
        .select('id')
        .in('step_id', removedIds)
        .is('deleted_at', null)
        .limit(1);
      if (linkedAssetsError) throwDatabaseError(linkedAssetsError, '暂时无法核对步骤图片。');
      if ((linkedAssets || []).length > 0) {
        throw new ApiError(409, 'VERSION_CONFLICT', '需要删除的步骤仍有关联图片，请先替换或移除图片。');
      }
      const { error: deleteError } = await client.from('care_article_steps').delete().in('id', removedIds);
      if (deleteError) throwDatabaseError(deleteError, '多余的文章步骤没有清理成功。');
    }
  }
  return sendData(request, response, camelize(data));
}));

const registerStatusRoute = (action: 'publish' | 'archive') => {
  adminRouter.post(`/content/:type/:id/${action}`, asyncRoute(async (request, response) => {
    const id = parseId(request.params.id);
    if (!['species', 'care'].includes(request.params.type)) throw new ApiError(400, 'VALIDATION_ERROR', '内容类型无效。');
    const parsed = contentStatusMutationSchema.safeParse(request.body);
    if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '内容版本无效。');
    const table = request.params.type === 'species' ? 'species' : 'care_articles';
    const client = getAdminSupabase();
    const { data, error } = await client.from(table).update({
      status: action === 'publish' ? 'published' : 'archived',
      published_at: action === 'publish' ? new Date().toISOString() : null,
    }).eq('id', id).eq('version', parsed.data.version).select('*').maybeSingle();
    if (error) throwDatabaseError(error, '内容状态没有更新成功。');
    if (!data) await throwMissingOrVersionConflict(client, table, id);
    return sendData(request, response, camelize(data));
  }));
};

registerStatusRoute('publish');
registerStatusRoute('archive');

adminRouter.post(
  '/assets',
  express.raw({ type: ['image/png', 'image/jpeg', 'image/webp'], limit: '20mb' }),
  asyncRoute(async (request, response) => {
    const parsed = assetUploadQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '图片上传参数无效。', parsed.error.flatten());
    const mimeType = request.header('content-type')?.split(';')[0].trim() || '';
    if (!supportedMimeTypes.has(mimeType)) throw new ApiError(400, 'VALIDATION_ERROR', '只支持 PNG、JPEG 和 WebP 图片。');
    if (!Buffer.isBuffer(request.body) || request.body.length === 0) throw new ApiError(400, 'VALIDATION_ERROR', '请选择需要上传的图片。');

    const idempotency = await beginIdempotentWrite(request);
    const client = getAdminSupabase();
    const contentTable = parsed.data.contentType === 'species' ? 'species' : 'care_articles';
    const { data: content, error: contentError } = await client.from(contentTable).select('id,catalog_key').eq('id', parsed.data.contentId).maybeSingle();
    if (contentError) throwDatabaseError(contentError, '暂时无法核对内容。');
    if (!content) throw new ApiError(404, 'NOT_FOUND', '没有找到需要绑定图片的内容。');

    const assetTable = parsed.data.contentType === 'species' ? 'species_assets' : 'care_article_assets';
    const foreignKey = parsed.data.contentType === 'species' ? 'species_id' : 'article_id';
    if (idempotency.replay?.resourceId) {
      const { data, error } = await client.from(assetTable).select('*').eq('id', idempotency.replay.resourceId).maybeSingle();
      if (error) throwDatabaseError(error, '暂时无法读取已上传的图片。');
      if (data) return sendData(request, response, camelize([data]), idempotency.replay.responseStatus);
    }
    if (parsed.data.contentType === 'care' && parsed.data.stepId) {
      const { data: step, error: stepError } = await client
        .from('care_article_steps')
        .select('id')
        .eq('id', parsed.data.stepId)
        .eq('article_id', content.id)
        .is('deleted_at', null)
        .maybeSingle();
      if (stepError) throwDatabaseError(stepError, '暂时无法核对文章步骤。');
      if (!step) throw new ApiError(404, 'NOT_FOUND', '没有找到需要绑定图片的文章步骤。');
    }
    const { data: latestAssets, error: latestError } = await client.from(assetTable).select('asset_version').eq(foreignKey, content.id).order('asset_version', { ascending: false }).limit(1);
    if (latestError) throwDatabaseError(latestError, '暂时无法读取图片版本。');
    const assetVersion = Number(latestAssets?.[0]?.asset_version || 0) + 1;
    const prefix = `${parsed.data.contentType}/${content.catalog_key}/v${assetVersion}`;
    const uploads: Array<{ bucket: string; path: string; buffer: Buffer; mime: string; variant: string; width?: number; height?: number }> = [];
    const metadata = await sharp(request.body).metadata();
    uploads.push({
      bucket: 'catalog-originals',
      path: `${prefix}/original.${originalExtension[mimeType]}`,
      buffer: request.body,
      mime: mimeType,
      variant: 'original',
      width: metadata.width,
      height: metadata.height,
    });

    if (parsed.data.contentType === 'species') {
      for (const item of [
        { variant: 'thumbnail', width: 256, quality: 82 },
        { variant: 'detail', width: 768, quality: 88 },
        { variant: 'texture', width: 1024, quality: 88 },
      ]) {
        const buffer = await sharp(request.body).rotate().resize({ width: item.width, withoutEnlargement: true }).webp({ quality: item.quality, alphaQuality: 100 }).toBuffer();
        const info = await sharp(buffer).metadata();
        uploads.push({ bucket: 'catalog-public', path: `${prefix}/${item.variant}.webp`, buffer, mime: 'image/webp', variant: item.variant, width: info.width, height: info.height });
      }
    } else {
      const variant = parsed.data.stepId ? 'article_step' : 'article_main';
      const buffer = await sharp(request.body).rotate().resize({ width: 960, withoutEnlargement: true }).webp({ quality: 86 }).toBuffer();
      const info = await sharp(buffer).metadata();
      uploads.push({ bucket: 'catalog-public', path: `${prefix}/${variant}${parsed.data.stepId ? `-${parsed.data.stepId}` : ''}.webp`, buffer, mime: 'image/webp', variant, width: info.width, height: info.height });
    }

    const uploaded: Array<{ bucket: string; path: string }> = [];
    let insertedIds: string[] = [];
    let supersededIds: string[] = [];
    try {
      for (const upload of uploads) {
        const { error } = await client.storage.from(upload.bucket).upload(upload.path, upload.buffer, { contentType: upload.mime, upsert: false });
        if (error) throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', `图片 ${upload.variant} 上传失败。`);
        uploaded.push({ bucket: upload.bucket, path: upload.path });
      }

      const variants = uploads.map(upload => upload.variant);
      const { data: currentRows, error: currentRowsError } = await client
        .from(assetTable)
        .select('id')
        .eq(foreignKey, content.id)
        .in('variant', variants)
        .eq('is_current', true);
      if (currentRowsError) throwDatabaseError(currentRowsError, '暂时无法读取当前素材版本。');
      supersededIds = (currentRows || []).map(row => row.id);
      if (supersededIds.length > 0) {
        const { error: supersedeError } = await client.from(assetTable).update({ is_current: false }).in('id', supersededIds);
        if (supersedeError) throwDatabaseError(supersedeError, '旧素材版本没有正确停用。');
      }
      const rows = uploads.map(upload => ({
        id: deterministicUuid(`${assetTable}:${content.id}:${upload.variant}:${assetVersion}`),
        [foreignKey]: content.id,
        ...(parsed.data.contentType === 'care' ? { step_id: parsed.data.stepId } : {}),
        variant: upload.variant,
        storage_bucket: upload.bucket,
        storage_path: upload.path,
        mime_type: upload.mime,
        width: upload.width,
        height: upload.height,
        byte_size: upload.buffer.length,
        checksum_sha256: createHash('sha256').update(upload.buffer).digest('hex'),
        asset_version: assetVersion,
        is_current: true,
      }));
      const { data, error } = await client.from(assetTable).insert(rows).select('*');
      if (error || !data) throwDatabaseError(error, '图片已上传，但素材记录没有保存成功。');
      insertedIds = data.map(row => row.id);
      await finishIdempotentWrite(request, idempotency, 'content_asset', data[0].id, 201);
      return sendData(request, response, camelize(data), 201);
    } catch (error) {
      if (insertedIds.length > 0) await client.from(assetTable).delete().in('id', insertedIds);
      if (supersededIds.length > 0) await client.from(assetTable).update({ is_current: true }).in('id', supersededIds);
      for (const group of ['catalog-originals', 'catalog-public']) {
        const paths = uploaded.filter(item => item.bucket === group).map(item => item.path);
        if (paths.length > 0) await client.storage.from(group).remove(paths);
      }
      throw error;
    }
  }),
);
