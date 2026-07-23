import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

type UserPathRecord = {
  id: string;
  start: string;
  target: string;
  route: string;
  maxNavigationClicks: number;
  taskScreens: number;
  safetyConfirmation: boolean;
  returnBehavior: string;
  emptyStateNextAction: string;
};

const registryUrl = new URL('./user-path-registry.json', import.meta.url);
const records = JSON.parse(readFileSync(fileURLToPath(registryUrl), 'utf8')) as UserPathRecord[];

const failures: string[] = [];
const ids = new Set<string>();

records.forEach(record => {
  if (ids.has(record.id)) failures.push(`${record.id}: id 重复`);
  ids.add(record.id);
  if (record.maxNavigationClicks > 3) failures.push(`${record.id}: 导航点击 ${record.maxNavigationClicks} 次`);
  if (record.taskScreens > 3) failures.push(`${record.id}: 任务共 ${record.taskScreens} 屏`);
  if (!record.route.startsWith('/')) failures.push(`${record.id}: 缺少正式路由`);
  if (!record.start || !record.target || !record.returnBehavior || !record.emptyStateNextAction) {
    failures.push(`${record.id}: 路径登记字段不完整`);
  }
});

const aquariumSource = readFileSync(fileURLToPath(new URL('../src/pages/Aquarium.tsx', import.meta.url)), 'utf8');
const careSource = readFileSync(fileURLToPath(new URL('../src/pages/CareEncyclopedia.tsx', import.meta.url)), 'utf8');

if (!aquariumSource.includes('一次完成今天检查')) failures.push('每日检查尚未合并为单页检查表');
if (!aquariumSource.includes('addFishSuccess ? (') || !aquariumSource.includes('addFishCompatibilityReview ? (')) {
  failures.push('添加生物尚未分离选择屏与结果确认屏');
}
if (!careSource.includes('一次填完') || careSource.includes('第 ${activeQuestionIndex + 1} 题')) {
  failures.push('养护问题自查仍包含逐题页面');
}

if (failures.length > 0) {
  console.error(`三步路径验收失败：\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(`三步路径验收通过：${records.length} 条正式路径均不超过 3 次导航点击和 3 个任务屏。`);
