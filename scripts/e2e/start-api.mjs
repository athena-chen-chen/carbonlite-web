import { spawn } from 'node:child_process';
import { assertE2eDatabaseSafety, resolveApiDir } from './test-db-safety.mjs';

assertE2eDatabaseSafety();

const apiDir = resolveApiDir();
const child = spawn('pnpm', ['dev'], {
  cwd: apiDir,
  env: {
    ...process.env,
    NODE_ENV: 'test',
    APP_ENV: 'test',
    PORT: process.env.E2E_API_PORT || process.env.PORT || '3333',
    JWT_SECRET: process.env.JWT_SECRET || 'carbonlite-e2e-jwt-secret',
    FRONTEND_URL: process.env.FRONTEND_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173',
  },
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
