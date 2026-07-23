import { Router } from 'express';
import {
  careArticleListQuerySchema,
  catalogKeySchema,
  speciesListQuerySchema,
  supportedLocaleSchema,
} from '../../../../packages/contracts/src/index';
import { mapCareArticleDetail, mapCareArticleSummary, mapSpeciesDetail, mapSpeciesSummary } from '../content-mappers';
import { ApiError, asyncRoute, sendData } from '../http';
import { getPublicSupabase } from '../supabase';

const decodeCursor = (cursor?: string) => {
  if (!cursor) return 0;
  try {
    const value = Number(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (!Number.isInteger(value) || value < 0) throw new Error('invalid cursor');
    return value;
  } catch {
    throw new ApiError(400, 'VALIDATION_ERROR', '分页位置无效。');
  }
};

const encodeCursor = (offset: number) => Buffer.from(String(offset), 'utf8').toString('base64url');

export const contentRouter = Router();

contentRouter.get('/species', asyncRoute(async (request, response) => {
  const parsed = speciesListQuerySchema.safeParse(request.query);
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '物种筛选条件无效。', parsed.error.flatten());
  const { limit, cursor, category, query, locale } = parsed.data;
  const offset = decodeCursor(cursor);
  const client = getPublicSupabase();

  let builder = client
    .from('species')
    .select('id,catalog_key,name,scientific_name,category,difficulty,water_temperature_text,ph_level_text,temperament,size_class,updated_at,species_assets(*),species_translations(*)')
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('catalog_key')
    .range(offset, offset + limit);
  if (category) builder = builder.eq('category', category);
  if (query) builder = builder.ilike('name', `%${query}%`);

  const { data, error } = await builder;
  if (error) throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', '物种内容暂时无法加载。');
  const rows = data || [];
  const hasMore = rows.length > limit;
  return sendData(request, response, {
    items: rows.slice(0, limit).map(row => mapSpeciesSummary(row, locale)),
    ...(hasMore ? { nextCursor: encodeCursor(offset + limit) } : {}),
  });
}));

contentRouter.get('/species/:catalogKey', asyncRoute(async (request, response) => {
  const parsed = catalogKeySchema.safeParse(request.params.catalogKey);
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '物种标识无效。');
  const localeParsed = supportedLocaleSchema.safeParse(request.query.locale || 'zh-CN');
  if (!localeParsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '语言参数无效。');
  const client = getPublicSupabase();
  const { data, error } = await client
    .from('species')
    .select('*,species_translations(*),species_feeding_profiles(*,species_feeding_profile_translations(*)),species_assets(*)')
    .eq('catalog_key', parsed.data)
    .eq('status', 'published')
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', '物种详情暂时无法加载。');
  if (!data) throw new ApiError(404, 'NOT_FOUND', '没有找到这个物种。');
  return sendData(request, response, mapSpeciesDetail(data, localeParsed.data));
}));

contentRouter.get('/care-articles', asyncRoute(async (request, response) => {
  const parsed = careArticleListQuerySchema.safeParse(request.query);
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '养护筛选条件无效。', parsed.error.flatten());
  const { limit, cursor, category, urgency, query, locale } = parsed.data;
  const offset = decodeCursor(cursor);
  const client = getPublicSupabase();

  let builder = client
    .from('care_articles')
    .select('id,catalog_key,title,category,urgency,summary,keywords,updated_at,care_article_assets(*),care_article_translations(*)')
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('catalog_key')
    .range(offset, offset + limit);
  if (category) builder = builder.eq('category', category);
  if (urgency) builder = builder.eq('urgency', urgency);
  if (query) builder = builder.ilike('title', `%${query}%`);

  const { data, error } = await builder;
  if (error) throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', '养护内容暂时无法加载。');
  const rows = data || [];
  const hasMore = rows.length > limit;
  return sendData(request, response, {
    items: rows.slice(0, limit).map(row => mapCareArticleSummary(row, locale)),
    ...(hasMore ? { nextCursor: encodeCursor(offset + limit) } : {}),
  });
}));

contentRouter.get('/care-articles/:catalogKey', asyncRoute(async (request, response) => {
  const parsed = catalogKeySchema.safeParse(request.params.catalogKey);
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '文章标识无效。');
  const localeParsed = supportedLocaleSchema.safeParse(request.query.locale || 'zh-CN');
  if (!localeParsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '语言参数无效。');
  const client = getPublicSupabase();
  const { data, error } = await client
    .from('care_articles')
    .select('*,care_article_translations(*),care_article_steps(*,care_article_step_translations(*)),care_article_assets(*)')
    .eq('catalog_key', parsed.data)
    .eq('status', 'published')
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', '养护详情暂时无法加载。');
  if (!data) throw new ApiError(404, 'NOT_FOUND', '没有找到这篇养护文章。');
  return sendData(request, response, mapCareArticleDetail(data, localeParsed.data));
}));
