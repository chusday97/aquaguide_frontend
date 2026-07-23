import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceRoots = ['src/pages', 'src/components'];
const sourceFiles = sourceRoots.flatMap(relativeRoot => {
  const absoluteRoot = path.join(root, relativeRoot);
  const walk = (directory: string): string[] => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    return entry.name.endsWith('.tsx') ? [absolute] : [];
  });
  return walk(absoluteRoot);
});

const productSource = sourceFiles
  .filter(file => !file.endsWith('/AIAssistant.tsx') && !file.endsWith('/ProjectStructurePreview.tsx'))
  .map(file => fs.readFileSync(file, 'utf8'))
  .join('\n');
const appSource = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');

assert.equal(productSource.includes('generateRiskAudit'), false, '产品页面不得直接调用旧 risk_audit。');
assert.equal(productSource.includes('generateRecommendationAssist'), false, '产品页面不得直接调用旧 recommendation_assist。');
assert.equal(appSource.includes('AIAssistant'), false, '独立 AI 助手不得出现在应用路由。');
assert.equal(productSource.includes('AI 建缸助手'), true, '鱼缸页必须保留 AI 建缸助手主入口。');
assert.equal(productSource.includes('AI 建缸规划'), false, '用户界面不得继续显示 AI 建缸规划旧名称。');
assert.equal(productSource.includes('让 AI 帮我解读'), false, '规则详情不得继续暴露通用 AI 解读入口。');
assert.equal(productSource.includes('让 AI 简短解释'), false, '今日行动不得继续暴露 AI 解释入口。');
assert.equal(productSource.includes('generateTankDailyCheckInterpretation'), true, '异常巡检必须保留受控 AI 解读。');

console.log('AI entry policy assertions passed');
