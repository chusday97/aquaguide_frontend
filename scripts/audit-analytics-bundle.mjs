import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const dist = path.join(process.cwd(), 'dist');
const expectNoAnalytics = process.argv.includes('--expect-no-analytics');
const html = readFileSync(path.join(dist, 'index.html'), 'utf8');
const entryMatch = html.match(/<script[^>]+src="\/assets\/(index-[^"]+\.js)"/);
assert(entryMatch, 'Unable to find the application entry chunk in dist/index.html');

const entryName = entryMatch[1];
const entry = readFileSync(path.join(dist, 'assets', entryName));
const rawKb = entry.byteLength / 1000;
const gzipKb = gzipSync(entry).byteLength / 1000;

assert(rawKb <= 322.69, `Entry bundle ${rawKb.toFixed(2)} kB exceeds the 322.69 kB budget`);
assert(gzipKb <= 103, `Entry gzip ${gzipKb.toFixed(2)} kB exceeds the 103.00 kB budget`);

const lazyAnalyticsChunks = readdirSync(path.join(dist, 'assets'))
  .filter(file => file.endsWith('.js') && file !== entryName)
  .filter(file => readFileSync(path.join(dist, 'assets', file), 'utf8').includes('PostHog'));

assert(!entry.toString('utf8').includes('PostHog'), 'Entry chunk must not contain the PostHog SDK');

if (expectNoAnalytics) {
  assert.equal(lazyAnalyticsChunks.length, 0, 'Unconfigured build must not emit or request a PostHog chunk');
  console.log(`Unconfigured analytics bundle passed: ${rawKb.toFixed(2)} kB raw, ${gzipKb.toFixed(2)} kB gzip, no PostHog chunk.`);
} else {
  assert(lazyAnalyticsChunks.length > 0, 'Configured build must emit PostHog in a separate lazy chunk');
  console.log(`Configured analytics bundle passed: ${rawKb.toFixed(2)} kB raw, ${gzipKb.toFixed(2)} kB gzip, lazy chunk ${lazyAnalyticsChunks[0]}.`);
}
