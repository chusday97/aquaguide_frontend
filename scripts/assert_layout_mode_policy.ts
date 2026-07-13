import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { detectLayoutMode } from '../src/components/layout/LayoutModeProvider';

const cases = [
  { name: 'UA Client Hint 手机', navigator: { userAgentData: { mobile: true } }, expected: 'phone' },
  { name: 'UA Client Hint 非手机', navigator: { userAgentData: { mobile: false } }, expected: 'desktop' },
  { name: 'iPhone', navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1' }, expected: 'phone' },
  { name: 'iPhone UA 优先于错误 Client Hint', navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1', userAgentData: { mobile: false } }, expected: 'phone' },
  { name: 'Android 手机', navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36' }, expected: 'phone' },
  { name: 'iPad', navigator: { userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' }, expected: 'desktop' },
  { name: 'Android 平板', navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X910) AppleWebKit/537.36 Chrome/130 Safari/537.36' }, expected: 'desktop' },
  { name: '桌面 Chrome', navigator: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130 Safari/537.36' }, expected: 'desktop' },
] as const;

for (const testCase of cases) {
  assert.equal(detectLayoutMode(testCase.navigator), testCase.expected, testCase.name);
}

const providerSource = readFileSync(new URL('../src/components/layout/LayoutModeProvider.tsx', import.meta.url), 'utf8');
assert.doesNotMatch(providerSource, /matchMedia|innerWidth|resize/, '设备布局不得跟随窗口宽度变化');

console.log(`layout mode policy: ${cases.length}/${cases.length} passed`);
