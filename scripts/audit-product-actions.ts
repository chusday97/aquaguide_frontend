import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const files = [
  'src/App.tsx',
  'src/pages/Aquarium.tsx',
  'src/pages/Encyclopedia.tsx',
  'src/pages/CareEncyclopedia.tsx',
  'src/pages/Collection.tsx',
  'src/components/CompatibilityRiskCalculator.tsx',
  'src/components/SpeciesDetailDialog.tsx',
  'src/components/product/StatusSummaryCard.tsx',
];

const forbiddenPatterns = [
  { label: 'empty click handler', pattern: /onClick\s*=\s*\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/g },
  { label: 'undefined click handler', pattern: /onClick\s*=\s*\{\s*\(\)\s*=>\s*undefined\s*\}/g },
  { label: 'console-only click handler', pattern: /onClick\s*=\s*\{\s*\(\)\s*=>\s*console\.(?:log|debug)\(/g },
  { label: 'native alert', pattern: /\b(?:window\.)?alert\s*\(/g },
];

const failures: string[] = [];
files.forEach(file => {
  const source = readFileSync(file, 'utf8');
  forbiddenPatterns.forEach(({ label, pattern }) => {
    pattern.lastIndex = 0;
    if (pattern.test(source)) failures.push(`${file}: ${label}`);
  });
});

assert.deepEqual(failures, [], failures.join('\n'));
console.log(`product actions: ${files.length} routed surfaces passed semantic handler audit`);
