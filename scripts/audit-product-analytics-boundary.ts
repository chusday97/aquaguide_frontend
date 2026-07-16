import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceRoot = path.join(root, 'src');
const boundary = path.join(sourceRoot, 'services/analytics/product-analytics.service.ts');

const collectSourceFiles = (directory: string): string[] => readdirSync(directory).flatMap(entry => {
  const fullPath = path.join(directory, entry);
  if (statSync(fullPath).isDirectory()) return collectSourceFiles(fullPath);
  return /\.(ts|tsx)$/.test(entry) ? [fullPath] : [];
});

const directImports = collectSourceFiles(sourceRoot)
  .filter(file => file !== boundary)
  .filter(file => /from\s+['"]posthog-js['"]|import\(['"]posthog-js['"]\)/.test(readFileSync(file, 'utf8')))
  .map(file => path.relative(root, file));

assert.deepEqual(directImports, [], `Only the analytics boundary may import posthog-js: ${directImports.join(', ')}`);

const expectedEvents = [
  'ai_message_sent',
  'care_article_favorited',
  'care_reminder_completed',
  'compatibility_check_run',
  'daily_check_completed',
  'memorial_recorded',
  'sign_in_failed',
  'species_added_to_aquarium',
  'species_detail_viewed',
  'species_favorited',
  'species_removed_from_aquarium',
  'user_signed_in',
];

const source = collectSourceFiles(sourceRoot).map(file => readFileSync(file, 'utf8')).join('\n');
expectedEvents.forEach(eventName => {
  assert.match(source, new RegExp(`captureProductEvent\\(['"]${eventName}['"]`), `Missing analytics event: ${eventName}`);
});

console.log(`Product analytics imports and ${expectedEvents.length} event names passed.`);
