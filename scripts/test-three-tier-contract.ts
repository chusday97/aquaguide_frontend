import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const migration = [
  '202607160001_core_schema.sql',
  '202607160002_localization.sql',
].map(file => readFileSync(resolve(root, 'supabase/migrations', file), 'utf8')).join('\n');
const contract = readFileSync(resolve(root, 'CONTRACT.md'), 'utf8');
const databaseTypes = readFileSync(resolve(root, 'src/types/database.ts'), 'utf8');

const tables = [
  'profiles',
  'user_roles',
  'species',
  'species_feeding_profiles',
  'species_assets',
  'care_articles',
  'care_article_steps',
  'care_article_assets',
  'aquariums',
  'aquarium_species',
  'aquarium_equipment',
  'aquarium_components',
  'diagnosis_records',
  'species_favorites',
  'care_favorites',
  'memorial_records',
  'care_reminders',
  'care_events',
  'migration_batches',
  'idempotency_records',
  'species_translations',
  'species_feeding_profile_translations',
  'care_article_translations',
  'care_article_step_translations',
];

for (const table of tables) {
  assert.match(migration, new RegExp(`create table public\\.${table} \\(`), `${table} must be created`);
  assert.match(migration, new RegExp(`'${table}'|alter table public\\.${table} enable row level security`), `${table} must enable RLS`);
}

assert.match(migration, /create policy species_public_select/);
assert.match(migration, /create policy aquariums_owner_all/);
assert.match(migration, /create policy diagnosis_owner_all/);
assert.match(migration, /create policy idempotency_records_owner_all/);
assert.match(migration, /catalog-originals/);
assert.match(migration, /catalog-public/);
assert.match(migration, /auth_user_created/);
assert.match(migration, /diagnosis_daily_check_idx/);
assert.match(migration, /care_reminders_active_source_idx/);
assert.match(migration, /create type public\.app_locale as enum \('zh-CN', 'en'\)/);
assert.match(migration, /create policy species_translations_public_select/);
assert.match(migration, /create policy care_translations_public_select/);

assert.match(contract, /前端仅使用 Supabase Auth 获取会话，不直接读写业务表/);
assert.match(contract, /Idempotency-Key/);
assert.match(contract, /VERSION_CONFLICT/);
assert.match(contract, /游客继续使用本地 Repository/);
assert.match(contract, /LocalizedContentMeta/);
assert.match(contract, /\/api\/v1\/profile/);

assert.match(databaseTypes, /export interface Database/);
assert.match(databaseTypes, /export interface AquariumWithRelations/);
assert.match(databaseTypes, /export interface SpeciesWithRelations/);
assert.match(databaseTypes, /export interface MigrationBatchRecord/);
assert.match(databaseTypes, /export interface IdempotencyRecord/);
assert.match(databaseTypes, /export interface SpeciesTranslationRecord/);
assert.match(databaseTypes, /export interface CareArticleTranslationRecord/);

console.log(`three-tier contract verified: ${tables.length} tables, RLS, Storage, API and shared types`);
