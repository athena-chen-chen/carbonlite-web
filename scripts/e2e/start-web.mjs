import { spawn } from 'node:child_process';

const child = spawn('pnpm', ['exec', 'vite', '--host', '127.0.0.1', '--port', '4173'], {
  env: {
    ...process.env,
    VITE_API_BASE_URL: process.env.E2E_API_BASE_URL || process.env.VITE_API_BASE_URL || 'http://127.0.0.1:3333/api',
    VITE_APP_ENV: 'local',
    VITE_PUBLIC_SIGNUP_ENABLED: 'false',
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
