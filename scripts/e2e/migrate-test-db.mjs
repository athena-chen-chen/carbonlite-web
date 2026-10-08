import { spawnSync } from 'node:child_process';
import { assertE2eDatabaseSafety, resolveApiDir } from './test-db-safety.mjs';

assertE2eDatabaseSafety();

const apiDir = resolveApiDir();

for (const args of [
  ['exec', 'prisma', 'generate'],
  ['exec', 'prisma', 'migrate', 'deploy'],
]) {
  const result = spawnSync('pnpm', args, {
    cwd: apiDir,
    env: process.env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
