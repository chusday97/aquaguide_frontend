import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), '..');
const binDir = path.join(rootDir, 'node_modules', '.bin');
const viteBin = path.join(binDir, process.platform === 'win32' ? 'vite.cmd' : 'vite');
const tsxBin = path.join(binDir, process.platform === 'win32' ? 'tsx.cmd' : 'tsx');

const children = [
  spawn(tsxBin, ['apps/api/src/index.ts'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env, API_PORT: process.env.API_PORT || '8787' },
  }),
  spawn(viteBin, ['--port=3000', '--host=0.0.0.0'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
  }),
];

const stopAll = () => {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
};

process.on('SIGINT', () => {
  stopAll();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopAll();
  process.exit(0);
});

for (const child of children) {
  child.on('exit', code => {
    if (code && code !== 0) {
      stopAll();
      process.exit(code);
    }
  });
}
