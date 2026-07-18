import { createHash, randomUUID } from 'node:crypto';
import express, { Router } from 'express';
import sharp from 'sharp';
import {
  rawVisionCandidateSchema,
  recognitionMissInputSchema,
  recognitionMissResolveSchema,
  speciesDiagnosisStepInputSchema,
  symptomObservationSchema,
} from '../../../../packages/contracts/src/index';
import { buildSpeciesDiagnosisStep } from '../../../../packages/domain-rules/src/index';
import { apiConfig } from '../config';
import { ApiError, asyncRoute, sendData } from '../http';
import { getAdminSupabase } from '../supabase';
import { ProviderError, requestSymptomObservations, requestVisionCandidates } from '../ai/provider';

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const sessionMisses = new Map<string, number>();
const rateBuckets = new Map<string, { startedAt: number; count: number }>();

const checkRateLimit = (request: express.Request) => {
  const key = String(request.headers['x-forwarded-for'] || request.ip || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const current = rateBuckets.get(key);
  if (!current || now - current.startedAt >= 60_000) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return;
  }
  if (current.count >= 10) throw new ApiError(429, 'RATE_LIMITED', '请求过于频繁，请稍后再试。');
  current.count += 1;
};

const providerFailure = (error: unknown) => error instanceof ProviderError ? error.reason : 'network' as const;

export const speciesAiRouter = Router();

speciesAiRouter.post(
  '/ai/species-recognition',
  express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '10mb' }),
  asyncRoute(async (request, response) => {
    checkRateLimit(request);
    const mimeType = request.header('content-type')?.split(';')[0].trim() || '';
    if (!allowedImageTypes.has(mimeType)) throw new ApiError(400, 'VALIDATION_ERROR', '仅支持 JPEG、PNG 或 WebP 图片。');
    if (!Buffer.isBuffer(request.body) || request.body.length === 0) throw new ApiError(400, 'VALIDATION_ERROR', '请选择一张图片。');
    const imageFingerprint = createHash('sha256').update(request.body).digest('hex');
    const locale = request.header('x-aquaguide-locale') === 'en' ? 'en' : 'zh-CN';
    let candidates: Array<ReturnType<typeof rawVisionCandidateSchema.parse>> = [];
    let source: 'model' | 'fallback' = 'model';
    let failureReason: 'not_configured' | 'timeout' | 'network' | 'invalid_response' | undefined;

    try {
      const normalized = await sharp(request.body)
        .rotate()
        .resize({ width: 1536, height: 1536, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 84 })
        .toBuffer();
      const raw = await requestVisionCandidates(`data:image/webp;base64,${normalized.toString('base64')}`, locale) as { candidates?: unknown };
      const parsed = rawVisionCandidateSchema.array().max(3).safeParse(raw.candidates);
      if (!parsed.success) throw new ProviderError('invalid_response', 'Vision candidates were invalid.');
      candidates = parsed.data;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Input buffer')) throw new ApiError(400, 'VALIDATION_ERROR', '图片无法读取，请换一张清晰图片。');
      source = 'fallback';
      failureReason = providerFailure(error);
    }

    return sendData(request, response, {
      recognitionId: randomUUID(),
      imageFingerprint,
      status: candidates.length === 0 ? 'unmatched' : candidates.length === 1 && candidates[0].confidenceBand === 'high' ? 'matched' : 'ambiguous',
      candidates: candidates.map(candidate => ({ ...candidate, matchType: 'none' as const })),
      requiresConfirmation: true as const,
      source,
      ...(failureReason ? { failureReason } : {}),
      generatedAt: new Date().toISOString(),
      modelName: apiConfig.visionModel || 'unconfigured',
    });
  }),
);

speciesAiRouter.post('/ai/species-recognition/misses', asyncRoute(async (request, response) => {
  const parsed = recognitionMissInputSchema.safeParse(request.body);
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '未命中记录无效。', parsed.error.flatten());
  const key = `${parsed.data.imageFingerprint}:${parsed.data.modelName}:${parsed.data.modelVersion || ''}`;
  try {
    const client = getAdminSupabase();
    let existingQuery = client
      .from('species_recognition_misses')
      .select('id,occurrence_count')
      .eq('image_sha256', parsed.data.imageFingerprint)
      .eq('model_name', parsed.data.modelName);
    existingQuery = parsed.data.modelVersion
      ? existingQuery.eq('model_version', parsed.data.modelVersion)
      : existingQuery.is('model_version', null);
    const { data: existing, error: readError } = await existingQuery.maybeSingle();
    if (readError) throw readError;
    if (existing) {
      const { error } = await client.from('species_recognition_misses').update({
        occurrence_count: existing.occurrence_count + 1,
        last_seen_at: new Date().toISOString(),
        candidate_labels: parsed.data.candidateLabels,
        candidate_catalog_keys: parsed.data.candidateCatalogKeys,
      }).eq('id', existing.id);
      if (error) throw error;
      return sendData(request, response, { persisted: true, missId: existing.id });
    }
    const { data, error } = await client.from('species_recognition_misses').insert({
      image_sha256: parsed.data.imageFingerprint,
      model_name: parsed.data.modelName,
      model_version: parsed.data.modelVersion,
      candidate_labels: parsed.data.candidateLabels,
      candidate_catalog_keys: parsed.data.candidateCatalogKeys,
    }).select('id').single();
    if (error || !data) throw error;
    return sendData(request, response, { persisted: true, missId: data.id }, 201);
  } catch {
    sessionMisses.set(key, (sessionMisses.get(key) || 0) + 1);
    return sendData(request, response, { persisted: false, storage: 'session', message: '云端未记录，本次未命中仅保留在当前会话。' });
  }
}));

speciesAiRouter.patch('/ai/species-recognition/misses/:id/resolve', asyncRoute(async (request, response) => {
  const parsed = recognitionMissResolveSchema.safeParse(request.body);
  if (!parsed.success || !/^[0-9a-f-]{36}$/i.test(request.params.id)) throw new ApiError(400, 'VALIDATION_ERROR', '确认结果无效。');
  try {
    const client = getAdminSupabase();
    const { data: species } = await client.from('species').select('catalog_key').eq('catalog_key', parsed.data.resolvedCatalogKey).maybeSingle();
    if (!species) throw new ApiError(404, 'NOT_FOUND', '物种库中没有这个物种。');
    const { data, error } = await client.from('species_recognition_misses').update({
      resolved_catalog_key: parsed.data.resolvedCatalogKey,
      resolved_at: new Date().toISOString(),
    }).eq('id', request.params.id).select('id').maybeSingle();
    if (error) throw error;
    if (!data) throw new ApiError(404, 'NOT_FOUND', '未找到这条识别记录。');
    return sendData(request, response, { persisted: true, missId: data.id });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    return sendData(request, response, { persisted: false, storage: 'session', message: '云端未记录，确认结果仅在当前会话生效。' });
  }
}));

speciesAiRouter.post('/ai/species-diagnosis/step', asyncRoute(async (request, response) => {
  checkRateLimit(request);
  const parsed = speciesDiagnosisStepInputSchema.safeParse(request.body);
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '状态描述或回答无效。', parsed.error.flatten());
  let observations = [] as Array<ReturnType<typeof symptomObservationSchema.parse>>;
  let source: 'model' | 'fallback' = 'model';
  let failureReason: 'not_configured' | 'network' | 'timeout' | 'invalid_json' | 'unknown' | undefined;
  try {
    const raw = await requestSymptomObservations({
      locale: parsed.data.locale,
      speciesCatalogKey: parsed.data.speciesCatalogKey,
      userDescription: parsed.data.userDescription,
      answers: parsed.data.answers,
    }) as { observations?: unknown };
    const validated = symptomObservationSchema.array().max(12).safeParse(raw.observations);
    if (!validated.success) throw new ProviderError('invalid_response', 'Symptom observations were invalid.');
    observations = validated.data;
  } catch (error) {
    source = 'fallback';
    const reason = providerFailure(error);
    failureReason = reason === 'invalid_response' ? 'invalid_json' : reason;
  }
  return sendData(request, response, buildSpeciesDiagnosisStep(parsed.data, observations, source, failureReason));
}));
