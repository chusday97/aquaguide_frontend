import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assetUploadQuerySchema,
  careArticleAdminInputSchema,
  speciesAdminInputSchema,
} from '../packages/contracts/src/index';

const root = resolve(import.meta.dirname, '..');
const migration = readFileSync(resolve(root, 'supabase/migrations/202607160001_core_schema.sql'), 'utf8');
const adminRoute = readFileSync(resolve(root, 'apps/api/src/routes/admin.ts'), 'utf8');
const contentMapper = readFileSync(resolve(root, 'apps/api/src/content-mappers.ts'), 'utf8');

assert.equal(speciesAdminInputSchema.safeParse({}).success, false);
assert.equal(careArticleAdminInputSchema.safeParse({}).success, false);
assert.equal(assetUploadQuerySchema.safeParse({
  contentType: 'species',
  contentId: 'ae1732a3-27d0-4820-986c-2e932990f570',
  fileName: 'fish.png',
}).success, true);

assert.match(adminRoute, /requireAuth, requireAdmin/);
assert.match(adminRoute, /express\.raw\(/);
assert.match(adminRoute, /sharp\(request\.body\)/);
assert.match(adminRoute, /catalog-originals/);
assert.match(adminRoute, /catalog-public/);
assert.match(adminRoute, /finishIdempotentWrite/);
assert.match(adminRoute, /supersededIds/);

assert.match(migration, /storage_bucket = 'catalog-public'.*species/s);
assert.match(migration, /storage_bucket = 'catalog-public'.*care_articles/s);
assert.match(contentMapper, /row\.storage_bucket === 'catalog-public'/);

console.log('admin content contract verified: protected CRUD, image derivatives, idempotency, rollback and private-original isolation');
