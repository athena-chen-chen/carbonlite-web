import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { spawn } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function databaseTarget(mode, env) {
  let url;
  try { url = new URL(env.DATABASE_URL); } catch {
    throw new Error('The selected env file must contain a valid PostgreSQL DATABASE_URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
      url.searchParams.has('host') || url.searchParams.has('hostaddr') ||
      /prod|production|staging|stage/i.test(decodeURIComponent(url.hostname + url.pathname))) {
    throw new Error('Refusing an unsafe database target.');
  }
  if (mode === 'localdb') {
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
        (url.port && url.port !== '5432') || url.pathname !== '/carbonlite_dev') {
      throw new Error('Local mode requires localhost:5432/carbonlite_dev.');
    }
    return 'Local PostgreSQL / carbonlite_dev';
  }
  if (mode !== 'neon' || !url.hostname.endsWith('.neon.tech') ||
      url.searchParams.get('sslmode') !== 'require' ||
      env.NEON_DEVELOPMENT_HOST !== url.hostname) {
    throw new Error('Neon mode requires sslmode=require and NEON_DEVELOPMENT_HOST matching a confirmed DEVELOPMENT endpoint.');
  }
  return 'Neon development';
}

export function loadDatabaseEnvironment(mode, apiDir, envFile) {
  let selected;
  try { selected = parseEnv(readFileSync(envFile, 'utf8')); } catch {
    throw new Error('Selected database env file is missing or unreadable. See docs/developer-databases.md.');
  }
  const summary = databaseTarget(mode, selected);
  // Retain backend secrets/settings without copying them into another file.
  // File selection wins over inherited DATABASE_URL; dotenv cannot override it.
  const base = parseEnv(readFileSync(path.join(apiDir, '.env'), 'utf8'));
  if ([base, selected, process.env].some(env =>
    ['production', 'pilot', 'staging', 'stage'].includes(env.APP_ENV) || env.NODE_ENV === 'production')) {
    throw new Error('Development commands refuse production, pilot, or staging environments.');
  }
  return {
    summary,
    env: {
      ...base, ...process.env,
      DATABASE_URL: selected.DATABASE_URL,
      NODE_ENV: 'development', APP_ENV: 'local', PORT: '3333',
      // dotenv treats the literal string "false" as truthy for override.
      DOTENV_CONFIG_PATH: path.join(apiDir, '.env'), DOTENV_CONFIG_OVERRIDE: '',
      // A successful login must come from the selected database.
      LOCAL_DEMO_AUTH_ENABLED: 'false',
      ALLOW_TASK7_DEV_FIXTURES: mode === 'localdb' ? 'true' : 'false',
      DEMO_RESET_ENABLED: mode === 'neon' ? 'false' : (base.DEMO_RESET_ENABLED || 'false'),
    },
  };
}

function main() {
  const [mode, action = 'dev'] = process.argv.slice(2);
  if (!['neon', 'localdb'].includes(mode) || !['dev', 'check', 'migrate'].includes(action)) {
    throw new Error('Usage: node scripts/dev-database.mjs neon|localdb [dev|check|migrate]');
  }
  const apiDir = path.resolve(process.env.CARBONLITE_API_DIR || path.join(root, '../carbonlite-api'));
  const envFile = path.join(root, mode === 'neon' ? '.env.neon.local' : '.env.docker.local');
  const { env, summary } = loadDatabaseEnvironment(mode, apiDir, envFile);
  console.log(`CarbonLite database: ${summary}`);
  if (action === 'check') return;
  // Starting the backend never runs migrations or seeds.
  const args = action === 'migrate'
    ? [path.join(apiDir, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy']
    : ['run', 'dev'];
  const child = spawn(action === 'migrate' ? process.execPath : 'npm', args, {
    cwd: apiDir, env, stdio: 'inherit',
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  child.on('error', () => { console.error('Could not start backend command.'); process.exitCode = 1; });
  child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) {
    // Only our fixed messages reach stdout; never print a URL or raw parse error.
    console.error(error instanceof Error && !['TypeError', 'URIError', 'SyntaxError'].includes(error.name)
      ? error.message : 'Invalid development database configuration.');
    process.exitCode = 1;
  }
}
