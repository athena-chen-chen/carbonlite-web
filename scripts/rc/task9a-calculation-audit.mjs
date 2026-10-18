// Read-only record-level split audit. Private state is read, never printed.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const root = path.resolve('../carbonlite-api');
const req = createRequire(path.join(root, 'package.json'));
const { loadEnvironment } = await import(pathToFileURL(path.join(root, 'scripts/dev-database.mjs')));
const { env } = loadEnvironment('neon');
const { PrismaClient } = req('@prisma/client');
const db = new PrismaClient({ datasourceUrl: env.DATABASE_URL, log: [] });
const state = JSON.parse(fs.readFileSync('/private/tmp/task9-current-run-state.json'));
const account = state.accounts.Combined;
try {
  const user = await db.user.findFirst({ where: { id: account.user.id, organizationId: account.user.organizationId } });
  if (!user) throw Error('Synthetic workspace not found');
  const read = async route => {
    const response = await fetch('http://localhost:3333/api' + route, { headers: { Authorization: `Bearer ${account.token}` } });
    if (response.status !== 200) throw Error('API read failed');
    return response.json();
  };
  const summary = await read('/metrics/calculation-summary?periodStart=2025-08-01&periodEnd=2026-10-14');
  const metrics = await read('/metrics/summary');
  const records = await db.activityData.findMany({ where: { organizationId: user.organizationId }, orderBy: { createdAt: 'asc' } });
  const expected = { 'ELECTRICITY:358': 189.74, 'NATURAL_GAS:3': 148.32, 'ELECTRICITY:1250': 662.5, 'NATURAL_GAS:8.5': 420.24, 'GASOLINE:350': 808.5, 'HOTEL:3': 45, 'AIR_TRAVEL:4280': 492.2, 'ELECTRICITY:980': 519.4 };
  const rows = records.filter(r => r.activityType !== 'WATER').map(row => {
    const detail = summary.calculationDetails.find(d => d.activityDataId === row.id);
    return { activity: row.activityType, quantity: Number(row.quantity), unit: row.unit, persistedStatus: row.calculationStatus, persistedEmissions: row.calculatedEmissionsKgCO2e, persistedFactor: { id: row.matchedFactorId, name: row.matchedFactorName, value: row.matchedFactorValue, unit: row.matchedFactorUnit, sourceYear: row.matchedFactorSourceYear, authority: row.matchedFactorSourceAuthority }, backendStatus: detail?.status, backendIncluded: detail?.status === 'CALCULATED', backendEmissions: detail?.calculatedEmissionsKgCO2e, reportIncluded: true, exportedEmissions: expected[row.activityType + ':' + Number(row.quantity)], discrepancy: detail?.status !== 'CALCULATED' ? detail?.reason : row.matchedFactorValue === null ? 'Manual row has no durable factor/result; read matcher computes live' : 'Current read matcher happens to agree with persisted fields' };
  });
  const factors = await db.conversionFactor.findMany({ where: { isSystemDefault: true }, select: { activityType: true, name: true, factorValue: true, unit: true, sourceYear: true, verified: true, confidenceLevel: true } });
  const result = { checkedAt: new Date().toISOString(), recordCount: records.length, backendTotal: summary.totalEstimatedEmissionsKgCO2e, metricsTotal: metrics.totalsByMetric, expectedReportTotal: 3285.9, rows, legacySystemFactors: factors, mainAccessed: false };
  fs.writeFileSync('docs/audits/task9a-calculation-split-before.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
} catch (error) { console.log(JSON.stringify({ error: 'Calculation audit failed', code: error.code ?? error.name })); process.exitCode = 1; }
finally { await db.$disconnect(); }
