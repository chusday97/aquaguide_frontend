import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { careTopicsData } from '../../src/data/careTopicsData';
import { fishData } from '../../src/data/fishData';
import { getSpeciesVisualSources } from '../../src/lib/speciesVisual';
import { deterministicUuid } from '../../apps/api/src/data-utils';
import { getAdminSupabase } from '../../apps/api/src/supabase';

const root = resolve(import.meta.dirname, '../..');
const shouldCommit = process.argv.includes('--commit');
const metadataOnly = process.argv.includes('--metadata-only');
const contentStatus = process.argv.includes('--draft') ? 'draft' : 'published';

type AssetCandidate = {
  variant: 'original' | 'thumbnail' | 'detail' | 'texture' | 'article_main';
  bucket: 'catalog-originals' | 'catalog-public';
  extension: string;
  mimeType: string;
  buffer: Buffer;
  width?: number;
  height?: number;
  checksum: string;
};

const sha256 = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex');
const publicFile = (url: string) => resolve(root, 'public', url.split('?')[0].replace(/^\//, ''));
const numericRange = (value: string) => {
  const numbers = [...value.matchAll(/\d+(?:\.\d+)?/g)].map(match => Number(match[0]));
  return numbers.length >= 2 ? [numbers[0], numbers[1]] as const : [undefined, undefined] as const;
};
const firstNumber = (value: string) => {
  const match = value.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : undefined;
};

const loadAsset = async (
  filePath: string,
  variant: AssetCandidate['variant'],
  bucket: AssetCandidate['bucket'],
): Promise<AssetCandidate> => {
  const buffer = await readFile(filePath);
  const metadata = await sharp(buffer).metadata();
  const extension = filePath.split('.').pop()?.toLowerCase() || 'bin';
  const mimeType = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
  return {
    variant,
    bucket,
    extension: extension === 'jpeg' ? 'jpg' : extension,
    mimeType,
    buffer,
    width: metadata.width,
    height: metadata.height,
    checksum: sha256(buffer),
  };
};

const speciesAssets = async (fish: (typeof fishData)[number]) => {
  const sources = getSpeciesVisualSources(fish);
  return Promise.all([
    loadAsset(publicFile(sources.fallback), 'original', 'catalog-originals'),
    loadAsset(publicFile(sources.thumbnail), 'thumbnail', 'catalog-public'),
    loadAsset(publicFile(sources.detail), 'detail', 'catalog-public'),
    loadAsset(publicFile(sources.texture), 'texture', 'catalog-public'),
  ]);
};

const careAssets = async (topic: (typeof careTopicsData)[number]) => {
  const sourcePath = publicFile(topic.imageUrl);
  const fileName = sourcePath.split('/').pop() || '';
  const stem = fileName.replace(/\.[^.]+$/, '');
  const responsivePath = resolve(root, 'public/responsive/care', `${stem}-960.webp`);
  return Promise.all([
    loadAsset(sourcePath, 'original', 'catalog-originals'),
    loadAsset(responsivePath, 'article_main', 'catalog-public'),
  ]);
};

const uploadAssetSet = async (
  client: SupabaseClient,
  options: {
    table: 'species_assets' | 'care_article_assets';
    foreignKey: 'species_id' | 'article_id';
    contentId: string;
    contentType: 'species' | 'care';
    catalogKey: string;
    assets: AssetCandidate[];
  },
) => {
  const { data: currentRows, error: currentError } = await client
    .from(options.table)
    .select('id,variant,checksum_sha256,asset_version')
    .eq(options.foreignKey, options.contentId)
    .eq('is_current', true)
    .is('deleted_at', null);
  if (currentError) throw new Error(`读取 ${options.catalogKey} 当前素材失败：${currentError.message}`);

  const matches = options.assets.every(asset => currentRows?.some(row => (
    row.variant === asset.variant && row.checksum_sha256 === asset.checksum
  )));
  if (matches) return 'unchanged';

  const assetVersion = Math.max(0, ...(currentRows || []).map(row => Number(row.asset_version))) + 1;
  const uploaded: Array<{ bucket: string; path: string }> = [];
  const supersededIds = (currentRows || []).map(row => row.id);
  const insertedIds: string[] = [];
  try {
    const rows = [];
    for (const asset of options.assets) {
      const path = `${options.contentType}/${options.catalogKey}/v${assetVersion}/${asset.variant}.${asset.extension}`;
      const { error: uploadError } = await client.storage.from(asset.bucket).upload(path, asset.buffer, {
        contentType: asset.mimeType,
        upsert: false,
      });
      if (uploadError) throw new Error(`上传 ${options.catalogKey}/${asset.variant} 失败：${uploadError.message}`);
      uploaded.push({ bucket: asset.bucket, path });
      const id = deterministicUuid(`${options.table}:${options.contentId}:${asset.variant}:${assetVersion}`);
      insertedIds.push(id);
      rows.push({
        id,
        [options.foreignKey]: options.contentId,
        variant: asset.variant,
        storage_bucket: asset.bucket,
        storage_path: path,
        mime_type: asset.mimeType,
        width: asset.width,
        height: asset.height,
        byte_size: asset.buffer.length,
        checksum_sha256: asset.checksum,
        asset_version: assetVersion,
        is_current: true,
      });
    }
    if (supersededIds.length > 0) {
      const { error } = await client.from(options.table).update({ is_current: false }).in('id', supersededIds);
      if (error) throw new Error(`停用 ${options.catalogKey} 旧素材失败：${error.message}`);
    }
    const { error: insertError } = await client.from(options.table).insert(rows);
    if (insertError) throw new Error(`保存 ${options.catalogKey} 素材清单失败：${insertError.message}`);
    return 'uploaded';
  } catch (error) {
    if (insertedIds.length > 0) await client.from(options.table).delete().in('id', insertedIds);
    if (supersededIds.length > 0) await client.from(options.table).update({ is_current: true }).in('id', supersededIds);
    for (const bucket of ['catalog-originals', 'catalog-public']) {
      const paths = uploaded.filter(item => item.bucket === bucket).map(item => item.path);
      if (paths.length > 0) await client.storage.from(bucket).remove(paths);
    }
    throw error;
  }
};

const validateLocalCatalog = async () => {
  const catalogKeys = new Set<string>();
  const duplicateKeys: string[] = [];
  const missingAssets: string[] = [];
  const assetOwnersByChecksum = new Map<string, string[]>();
  for (const item of [...fishData, ...careTopicsData]) {
    if (catalogKeys.has(item.id)) duplicateKeys.push(item.id);
    catalogKeys.add(item.id);
  }
  for (const fish of fishData) {
    try {
      for (const asset of await speciesAssets(fish)) {
        assetOwnersByChecksum.set(asset.checksum, [...(assetOwnersByChecksum.get(asset.checksum) || []), `${fish.id}:${asset.variant}`]);
      }
    } catch { missingAssets.push(fish.id); }
  }
  for (const topic of careTopicsData) {
    try {
      for (const asset of await careAssets(topic)) {
        assetOwnersByChecksum.set(asset.checksum, [...(assetOwnersByChecksum.get(asset.checksum) || []), `${topic.id}:${asset.variant}`]);
      }
    } catch { missingAssets.push(topic.id); }
  }
  if (duplicateKeys.length > 0 || missingAssets.length > 0) {
    throw new Error(`内容预检失败：重复 ID ${duplicateKeys.length}，缺失素材 ${missingAssets.length}${missingAssets.length ? `（${missingAssets.slice(0, 8).join('、')}）` : ''}`);
  }
  const crossContentDuplicates = [...assetOwnersByChecksum.values()].filter(owners => (
    new Set(owners.map(owner => owner.split(':')[0])).size > 1
  ));
  return {
    species: fishData.length,
    careArticles: careTopicsData.length,
    assets: fishData.length * 4 + careTopicsData.length * 2,
    crossContentDuplicateAssetGroups: crossContentDuplicates.length,
    crossContentDuplicateSamples: crossContentDuplicates.slice(0, 10),
  };
};

const existingIds = async (client: SupabaseClient, table: 'species' | 'care_articles') => {
  const { data, error } = await client.from(table).select('id,catalog_key');
  if (error) throw new Error(`读取 ${table} 已有内容失败：${error.message}`);
  return new Map((data || []).map(row => [row.catalog_key, row.id]));
};

const importSpecies = async (client: SupabaseClient) => {
  const ids = await existingIds(client, 'species');
  let assetsUploaded = 0;
  for (const fish of fishData) {
    const id = ids.get(fish.id) || deterministicUuid(`catalog:species:${fish.id}`);
    const [temperatureMin, temperatureMax] = numericRange(fish.waterTemperature);
    const [phMin, phMax] = numericRange(fish.phLevel);
    const { error } = await client.from('species').upsert({
      id,
      catalog_key: fish.id,
      name: fish.name,
      scientific_name: fish.scientificName,
      category: fish.category,
      difficulty: fish.difficulty,
      water_temperature_text: fish.waterTemperature,
      water_temperature_min_c: temperatureMin,
      water_temperature_max_c: temperatureMax,
      ph_level_text: fish.phLevel,
      ph_min: phMin,
      ph_max: phMax,
      water_change_cycle_days: fish.waterChangeCycle,
      description: fish.description,
      diet: fish.diet,
      tank_size_text: fish.tankSize,
      min_tank_liters: firstNumber(fish.tankSize),
      temperament: fish.temperament,
      size_class: fish.size,
      housing_mode: fish.housingMode,
      housing_reason: fish.housingReason,
      is_custom: Boolean(fish.isCustom),
      search_terms: [fish.name, fish.scientificName, fish.category],
      status: contentStatus,
      published_at: contentStatus === 'published' ? new Date().toISOString() : null,
      deleted_at: null,
    }, { onConflict: 'id' });
    if (error) throw new Error(`导入物种 ${fish.id} 失败：${error.message}`);

    if (fish.feedingProfile) {
      const profile = fish.feedingProfile;
      const { error: profileError } = await client.from('species_feeding_profiles').upsert({
        id: deterministicUuid(`${id}:feeding`),
        species_id: id,
        diet_type: profile.dietType,
        feeding_type: profile.feedingType,
        recommended_foods: profile.recommendedFoods,
        feeding_frequency: profile.feedingFrequency,
        portion_rule: profile.portionRule,
        feeding_layer: profile.feedingLayer,
        avoid_foods: profile.avoidFoods,
        special_notes: profile.specialNotes,
        confidence: profile.confidence,
        source_name: profile.sourceName,
        source_url: profile.sourceUrl,
        source_fields: profile.sourceFields || [],
        needs_review: Boolean(profile.needsReview),
        review_reason: profile.reviewReason,
        deleted_at: null,
      }, { onConflict: 'species_id' });
      if (profileError) throw new Error(`导入物种 ${fish.id} 喂养资料失败：${profileError.message}`);
    }
    if (!metadataOnly) {
      const result = await uploadAssetSet(client, {
        table: 'species_assets',
        foreignKey: 'species_id',
        contentId: id,
        contentType: 'species',
        catalogKey: fish.id,
        assets: await speciesAssets(fish),
      });
      if (result === 'uploaded') assetsUploaded += 1;
    }
  }
  return assetsUploaded;
};

const importCareArticles = async (client: SupabaseClient) => {
  const ids = await existingIds(client, 'care_articles');
  const { data: knownSteps, error: knownStepsError } = await client
    .from('care_article_steps')
    .select('id,article_id,position');
  if (knownStepsError) throw new Error(`读取已有养护步骤失败：${knownStepsError.message}`);
  const stepIds = new Map((knownSteps || []).map(step => [`${step.article_id}:${step.position}`, step.id]));
  let assetsUploaded = 0;
  for (const topic of careTopicsData) {
    const id = ids.get(topic.id) || deterministicUuid(`catalog:care:${topic.id}`);
    const { error } = await client.from('care_articles').upsert({
      id,
      catalog_key: topic.id,
      title: topic.title,
      category: topic.category,
      urgency: topic.urgency,
      summary: topic.summary,
      symptoms: topic.symptoms,
      avoid_actions: topic.avoid,
      observe_items: topic.observe,
      diagnose_when: topic.diagnoseWhen,
      next_step: topic.nextStep,
      keywords: topic.keywords,
      status: contentStatus,
      published_at: contentStatus === 'published' ? new Date().toISOString() : null,
      deleted_at: null,
    }, { onConflict: 'id' });
    if (error) throw new Error(`导入养护文章 ${topic.id} 失败：${error.message}`);

    for (const [index, instruction] of topic.firstSteps.entries()) {
      const position = index + 1;
      const { error: stepError } = await client.from('care_article_steps').upsert({
        id: stepIds.get(`${id}:${position}`) || deterministicUuid(`${id}:step:${position}`),
        article_id: id,
        position,
        instruction,
        deleted_at: null,
      }, { onConflict: 'article_id,position' });
      if (stepError) throw new Error(`导入养护文章 ${topic.id} 第 ${index + 1} 步失败：${stepError.message}`);
    }
    const { error: obsoleteStepError } = await client
      .from('care_article_steps')
      .update({ deleted_at: new Date().toISOString() })
      .eq('article_id', id)
      .gt('position', topic.firstSteps.length)
      .is('deleted_at', null);
    if (obsoleteStepError) throw new Error(`清理养护文章 ${topic.id} 旧步骤失败：${obsoleteStepError.message}`);
    if (!metadataOnly) {
      const result = await uploadAssetSet(client, {
        table: 'care_article_assets',
        foreignKey: 'article_id',
        contentId: id,
        contentType: 'care',
        catalogKey: topic.id,
        assets: await careAssets(topic),
      });
      if (result === 'uploaded') assetsUploaded += 1;
    }
  }
  return assetsUploaded;
};

const summary = await validateLocalCatalog();
if (!shouldCommit) {
  console.log(JSON.stringify({ mode: 'dry-run', status: contentStatus, metadataOnly, ...summary }, null, 2));
  console.log('预检通过。使用 --commit 才会写入已配置的 Supabase 项目。');
} else {
  const client = getAdminSupabase();
  const speciesAssetUpdates = await importSpecies(client);
  const careAssetUpdates = await importCareArticles(client);
  console.log(JSON.stringify({
    mode: 'commit',
    status: contentStatus,
    metadataOnly,
    ...summary,
    assetGroupsUploaded: speciesAssetUpdates + careAssetUpdates,
  }, null, 2));
}
