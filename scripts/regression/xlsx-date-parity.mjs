// Run from the frontend checkout; requires the sibling backend's installed deps.
// No application bootstrap, Prisma client or database is used.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const apiRoot = resolve(process.env.CARBONLITE_API_DIR || join(root, '../carbonlite-api'));
const req = createRequire(join(apiRoot, 'package.json'));
req('ts-node').register({ transpileOnly: true, project: join(apiRoot, 'tsconfig.json') });
const { parseSpreadsheetActivityRows } = req(join(apiRoot, 'src/document-extraction/spreadsheet-activity-rows.ts'));
const fixtureRoot = join(root, 'test-fixtures/xlsx-date-systems');
const expected = JSON.parse(readFileSync(join(fixtureRoot, 'expected.json'), 'utf8'));
const results = {};
for (const system of ['1900', '1904']) {
  results[system] = parseSpreadsheetActivityRows(readFileSync(join(fixtureRoot, `dates-${system}.xlsx`)))
    .map(row => Object.fromEntries(Object.keys(expected[0]).map(key => [key, row[key]])));
}
results.fieldMappingDates = parseSpreadsheetActivityRows(readFileSync(join(root, 'apps/web-e2e/fixtures/carbonlite_field_mapping_original.xlsx')))
  .map(row => row.recordDate);
const temporary = mkdtempSync(join(tmpdir(), 'carbonlite-xlsx-parity-'));
try {
  const output = join(temporary, 'backend-results.json');
  writeFileSync(output, JSON.stringify(results));
  const webRequire = createRequire(join(root, 'package.json'));
  const result = spawnSync(process.execPath, [join(dirname(webRequire.resolve('vitest/package.json')), 'vitest.mjs'), 'run',
    'src/components/ExcelInputTable.test.tsx', '-t', 'F22'], {
    cwd: root, stdio: 'inherit', env: { ...process.env, F22_BACKEND_RESULTS: output },
  });
  process.exitCode = result.status ?? 1;
} finally { rmSync(temporary, { recursive: true, force: true }); }
